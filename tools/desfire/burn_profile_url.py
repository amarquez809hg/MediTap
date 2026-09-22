#!/usr/bin/env python3
"""Write a MediTap profile URL onto a MIFARE DESFire EV1/EV2/EV3 card.

The card is formatted as an NFC Forum Type 4 tag. A phone that taps it opens
the URL. Medical details stay on the MediTap server.

Factory PICC master key and the new application's master key are AES-128
zeros, which is the DESFire EV2/EV3 default. This script refuses to change
those keys.

Examples (from the MediTap repo, with the acr1311 virtualenv active):

  python tools/desfire/burn_profile_url.py --self-test
  python tools/desfire/burn_profile_url.py --read
  python tools/desfire/burn_profile_url.py --auth-test
  python tools/desfire/burn_profile_url.py --url http://localhost:8100/card/TOKEN
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from dataclasses import dataclass

try:
    from Crypto.Cipher import AES, DES
except ImportError:  # pragma: no cover - reported at runtime
    AES = None  # type: ignore
    DES = None  # type: ignore

NDEF_AID = bytes.fromhex("010000")  # DESFire AID 000001, little-endian on the wire
NDEF_DF = bytes.fromhex("D2760000850101")
NDEF_APP_FID = 0xE110
CC_FILE = 0x01
CC_ISO = 0xE103
NDEF_FILE = 0x02
NDEF_ISO = 0xE104
ZERO_AES = bytes(16)

STATUS = {
    0x00: "ok",
    0x0C: "no change",
    0x0E: "out of eeprom",
    0x1C: "illegal command",
    0x1E: "integrity error",
    0x40: "no such key",
    0x7E: "length error",
    0x9D: "permission denied",
    0x9E: "parameter error",
    0xA0: "application not found",
    0xAE: "authentication error",
    0xAF: "additional frame",
    0xBE: "boundary error",
    0xCA: "command aborted",
    0xDE: "duplicate error",
    0xF0: "file not found",
}


class CardError(RuntimeError):
    def __init__(self, message: str, status: int | None = None):
        self.status = status
        if status is not None:
            name = STATUS.get(status, "unknown")
            message = f"{message} (status {status:02X} {name})"
        super().__init__(message)


def _require_crypto() -> None:
    if AES is None or DES is None:
        raise SystemExit(
            "pycryptodome is not installed. From the card virtualenv:\n"
            "  python -m pip install -r tools/desfire/requirements.txt"
        )


def _odd_parity_des(key: bytes) -> bytes:
    """DES implementations ignore the low bit. DESFire does not use that bit as key material."""
    out = bytearray()
    for byte in key:
        byte &= 0xFE
        if bin(byte).count("1") % 2 == 0:
            byte |= 0x01
        out.append(byte)
    return bytes(out)


def _desfire_des_cbc(key8: bytes, iv: bytes, data: bytes, to_card: bool) -> bytes:
    """Single-DES CBC with DESFire's swapped encrypt/decrypt direction."""
    cipher = DES.new(key8, DES.MODE_ECB)
    out = bytearray()
    current_iv = iv
    for offset in range(0, len(data), 8):
        block = data[offset : offset + 8]
        if to_card:
            mixed = _xor(block, current_iv)
            current_iv = cipher.decrypt(mixed)
            out.extend(current_iv)
        else:
            plain = _xor(cipher.encrypt(block), current_iv)
            current_iv = block
            out.extend(plain)
    return bytes(out)


def _xor(left: bytes, right: bytes) -> bytes:
    return bytes(a ^ b for a, b in zip(left, right))


def _shift_left_128(block: bytes) -> bytes:
    value = int.from_bytes(block, "big") << 1
    value &= (1 << 128) - 1
    if block[0] & 0x80:
        value ^= 0x87
    return value.to_bytes(16, "big")


def aes_cmac(key: bytes, iv: bytes, data: bytes) -> tuple[bytes, bytes]:
    """One DESFire/NIST AES-CMAC step. Returns (full mac, next iv)."""
    _require_crypto()
    cipher = AES.new(key, AES.MODE_ECB)
    k1 = _shift_left_128(cipher.encrypt(bytes(16)))
    k2 = _shift_left_128(k1)
    if data and len(data) % 16 == 0:
        padded = data
        mask = k1
    else:
        missing = 16 - (len(data) % 16)
        padded = data + b"\x80" + b"\x00" * (missing - 1)
        mask = k2
    blocks = [padded[i : i + 16] for i in range(0, len(padded), 16)]
    blocks[-1] = _xor(blocks[-1], mask)
    out = AES.new(key, AES.MODE_CBC, iv).encrypt(b"".join(blocks))
    mac = out[-16:]
    return mac, mac


def truncate_cmac(mac: bytes) -> bytes:
    return bytes(mac[index] for index in range(1, 16, 2))


@dataclass
class Session:
    key: bytes
    iv: bytes

    @classmethod
    def from_key(cls, key: bytes) -> "Session":
        return cls(key=key, iv=bytes(16))

    def copy(self) -> "Session":
        return Session(self.key, self.iv)

    def mac(self, data: bytes) -> bytes:
        full, self.iv = aes_cmac(self.key, self.iv, data)
        return truncate_cmac(full)


def _cbc(key: bytes, iv: bytes, data: bytes, decrypt: bool) -> bytes:
    _require_crypto()
    cipher = AES.new(key, AES.MODE_CBC, iv)
    return cipher.decrypt(data) if decrypt else cipher.encrypt(data)


def build_ndef_file(url: str) -> bytes:
    text = url.strip()
    if not text:
        raise ValueError("URL is empty.")
    try:
        text.encode("ascii")
    except UnicodeEncodeError as exc:
        raise ValueError("URL must be ASCII so the NDEF URI record stays portable.") from exc
    prefixes = (
        (0x02, "https://www."),
        (0x01, "http://www."),
        (0x04, "https://"),
        (0x03, "http://"),
    )
    code = 0x00
    rest = text
    for prefix_code, prefix in prefixes:
        if text.startswith(prefix):
            code = prefix_code
            rest = text[len(prefix) :]
            break
    payload = bytes([code]) + rest.encode("ascii")
    if len(payload) > 255:
        raise ValueError("URL is too long for one short NDEF record.")
    record = bytes([0xD1, 0x01, len(payload), 0x55]) + payload
    return len(record).to_bytes(2, "big") + record + b"\xfe"


def capability_container(max_ndef: int) -> bytes:
    if not 15 <= max_ndef <= 0xFFFF:
        raise ValueError("NDEF file size is out of range.")
    return bytes(
        [
            0x00,
            0x0F,
            0x20,
            0x00,
            0x3B,
            0x00,
            0x34,
            0x04,
            0x06,
            0xE1,
            0x04,
            (max_ndef >> 8) & 0xFF,
            max_ndef & 0xFF,
            0x00,
            0xFF,
        ]
    )


def parse_ndef_url(blob: bytes) -> str:
    if len(blob) < 6:
        raise ValueError("NDEF file is too short.")
    length = int.from_bytes(blob[:2], "big")
    record = blob[2 : 2 + length]
    if len(record) < 5 or record[3] != 0x55:
        raise ValueError("NDEF file is not a URI record.")
    payload = record[4:]
    prefixes = {
        0x00: "",
        0x01: "http://www.",
        0x02: "https://www.",
        0x03: "http://",
        0x04: "https://",
    }
    return prefixes.get(payload[0], "") + payload[1:].decode("ascii", errors="replace")


def _self_test() -> None:
    _require_crypto()
    key = bytes.fromhex("2b7e151628aed2a6abf7158809cf4f3c")
    mac, _iv = aes_cmac(key, bytes(16), b"")
    if mac.hex() != "bb1d6929e95937287fa37d129b756746":
        raise SystemExit(f"AES-CMAC self-test failed: {mac.hex()}")
    ndef = build_ndef_file("https://nxp.com")
    # https:// is prefix 0x04, remainder nxp.com
    if parse_ndef_url(ndef) != "https://nxp.com":
        raise SystemExit(f"NDEF self-test failed: {ndef.hex()} -> {parse_ndef_url(ndef)}")
    cc = capability_container(255)
    if cc.hex() != "000f20003b00340406e10400ff00ff":
        raise SystemExit(f"CC self-test failed: {cc.hex()}")
    print("Self-test passed (AES-CMAC, NDEF URI, capability container).")


def _hex(blob: bytes) -> str:
    return blob.hex(" ").upper()


class Desfire:
    def __init__(self, connection, verbose: bool = True):
        self.connection = connection
        self.verbose = verbose
        self.session: Session | None = None

    def _log(self, message: str) -> None:
        if self.verbose:
            print(message)

    def transmit(self, apdu: list[int]) -> tuple[bytes, int, int]:
        data, sw1, sw2 = self.connection.transmit(apdu)
        return bytes(data), sw1, sw2

    def command(self, code: int, data: bytes = b"", mac: bool = True) -> bytes:
        if self.session is not None and mac:
            self.session.mac(bytes([code]) + data)
        apdu = [0x90, code, 0x00, 0x00, len(data), *data, 0x00] if data else [0x90, code, 0x00, 0x00, 0x00]
        self._log(f"  >> {_hex(bytes(apdu))}")
        raw, sw1, sw2 = self.transmit(apdu)
        self._log(f"  << {_hex(raw)}  {sw1:02X} {sw2:02X}")
        if sw1 != 0x91:
            self.session = None
            raise CardError(f"Unexpected PC/SC status {sw1:02X}{sw2:02X} for command {code:02X}")
        status = sw2
        if status not in (0x00, 0xAF):
            self.session = None
            raise CardError(f"Command {code:02X} failed", status)
        if self.session is not None and mac and status == 0x00:
            raw = self._accept_response(raw, status)
        return raw

    def _accept_response(self, raw: bytes, status: int) -> bytes:
        """Update the CMAC IV. Strip an 8-byte response CMAC when the card sent one."""
        assert self.session is not None
        if len(raw) >= 8:
            body, got = raw[:-8], raw[-8:]
            trial = self.session.copy()
            if trial.mac(body + bytes([status])) == got:
                self.session = trial
                return body
        self.session.mac(raw + bytes([status]))
        return raw

    def raw_command(self, code: int, data: bytes = b"") -> tuple[bytes, int]:
        """Send one command without touching the CMAC session."""
        apdu = [0x90, code, 0x00, 0x00, len(data), *data, 0x00] if data else [0x90, code, 0x00, 0x00, 0x00]
        self._log(f"  >> {_hex(bytes(apdu))}")
        raw, sw1, sw2 = self.transmit(apdu)
        self._log(f"  << {_hex(raw)}  {sw1:02X} {sw2:02X}")
        if sw1 != 0x91:
            raise CardError(f"Unexpected PC/SC status {sw1:02X}{sw2:02X} for command {code:02X}")
        return raw, sw2

    def get_version(self) -> tuple[bytes, bytes, bytes]:
        frames = []
        raw, status = self.raw_command(0x60, b"")
        frames.append(raw)
        while status == 0xAF:
            raw, status = self.raw_command(0xAF, b"")
            frames.append(raw)
        if status != 0x00 or len(frames) < 3:
            raise CardError("GetVersion did not return three frames", status)
        return frames[0], frames[1], frames[2]

    def select_application(self, aid: bytes) -> None:
        self.command(0x5A, aid)
        # Selecting an application ends the previous authentication.
        self.session = None

    def application_ids(self) -> list[bytes]:
        raw, status = self.raw_command(0x6A, b"")
        parts = [raw]
        while status == 0xAF:
            raw, status = self.raw_command(0xAF, b"")
            parts.append(raw)
        if status != 0x00:
            raise CardError("GetApplicationIDs failed", status)
        blob = b"".join(parts)
        return [blob[i : i + 3] for i in range(0, len(blob), 3) if len(blob[i : i + 3]) == 3]

    def key_settings(self) -> bytes:
        raw, status = self.raw_command(0x45, b"")
        if status != 0x00:
            raise CardError("GetKeySettings failed", status)
        return raw

    def authenticate_legacy_des(self, key_no: int, key8: bytes) -> None:
        """D40 DES authentication. Later commands in this session are sent in the clear."""
        _require_crypto()
        if len(key8) != 8:
            raise CardError("Legacy DES authentication needs an 8-byte key.")
        des_key = _odd_parity_des(key8)
        enc_b, status = self.raw_command(0x0A, bytes([key_no]))
        if status != 0xAF or len(enc_b) != 8:
            enc_b, status = self.raw_command(0x1A, bytes([key_no]))
        if status != 0xAF or len(enc_b) != 8:
            raise CardError("DES authentication was rejected", status)
        rnd_b = _desfire_des_cbc(des_key, bytes(8), enc_b, to_card=False)
        rnd_a = os.urandom(8)
        token = _desfire_des_cbc(des_key, enc_b, rnd_a + rnd_b[1:] + rnd_b[:1], to_card=True)
        enc_a, status = self.raw_command(0xAF, token)
        if status != 0x00 or len(enc_a) != 8:
            raise CardError("DES authentication second step failed", status)
        self.session = None
        self._log("  authenticated with legacy DES")

    def authenticate_aes(self, key_no: int, key: bytes) -> None:
        enc_b, status = self.raw_command(0xAA, bytes([key_no]))
        if status != 0xAF or len(enc_b) != 16:
            raise CardError(
                "AuthenticateAES was rejected. A factory EV3 accepts the all-zero AES key; "
                "this card's master key may already have been changed",
                status,
            )
        rnd_b = _cbc(key, bytes(16), enc_b, decrypt=True)
        rnd_a = os.urandom(16)
        token = _cbc(key, bytes(16), rnd_a + rnd_b[1:] + rnd_b[:1], decrypt=False)
        enc_a, status = self.raw_command(0xAF, token)
        if status != 0x00 or len(enc_a) != 16:
            raise CardError("AuthenticateAES second step failed", status)
        session_key = rnd_a[0:4] + rnd_b[0:4] + rnd_a[12:16] + rnd_b[12:16]
        self.session = Session.from_key(session_key)
        self._log("  authenticated with AES")

    def create_ndef_application(self) -> None:
        payload = bytearray(NDEF_AID)
        payload.append(0x0B)  # key settings 1
        payload.append(0xA1)  # AES, ISO file IDs, 1 key
        payload.append(NDEF_APP_FID & 0xFF)
        payload.append((NDEF_APP_FID >> 8) & 0xFF)
        payload.extend(NDEF_DF)
        self.command(0xCA, bytes(payload))

    def create_std_file(self, file_no: int, iso_fid: int, size: int) -> None:
        # Access rights 0xE000 little-endian: read free, other rights = key 0.
        payload = bytes(
            [
                file_no,
                iso_fid & 0xFF,
                (iso_fid >> 8) & 0xFF,
                0x00,
                0x00,
                0xE0,
                size & 0xFF,
                (size >> 8) & 0xFF,
                (size >> 16) & 0xFF,
            ]
        )
        self.command(0xCD, payload)

    def write_data(self, file_no: int, blob: bytes) -> None:
        offset = 0
        while offset < len(blob):
            chunk = blob[offset : offset + 40]
            payload = (
                bytes([file_no])
                + offset.to_bytes(3, "little")
                + len(chunk).to_bytes(3, "little")
                + chunk
            )
            self.command(0x3D, payload)
            offset += len(chunk)

    def delete_application(self, aid: bytes) -> None:
        self.command(0xDA, aid)

    def iso_select(self, apdu: list[int]) -> bytes:
        self._log(f"  >> {_hex(bytes(apdu))}")
        data, sw1, sw2 = self.transmit(apdu)
        self._log(f"  << {_hex(data)}  {sw1:02X} {sw2:02X}")
        if (sw1, sw2) != (0x90, 0x00):
            raise CardError(f"ISO command failed with {sw1:02X}{sw2:02X}")
        return data

    def read_ndef_url(self) -> str:
        self.iso_select([0x00, 0xA4, 0x04, 0x00, 0x07, *NDEF_DF, 0x00])
        self.iso_select([0x00, 0xA4, 0x00, 0x0C, 0x02, (NDEF_ISO >> 8) & 0xFF, NDEF_ISO & 0xFF])
        head = self.iso_select([0x00, 0xB0, 0x00, 0x00, 0x02])
        length = int.from_bytes(head, "big")
        if length <= 0 or length > 512:
            raise CardError(f"NDEF length {length} is not usable")
        body = bytearray()
        offset = 2
        while len(body) < length:
            take = min(32, length - len(body))
            chunk = self.iso_select([0x00, 0xB0, (offset >> 8) & 0xFF, offset & 0xFF, take])
            if not chunk:
                break
            body.extend(chunk)
            offset += len(chunk)
        return parse_ndef_url(head + bytes(body))


def connect(wait_seconds: float):
    try:
        from smartcard.Exceptions import NoCardException
        from smartcard.System import readers
    except ImportError as exc:
        raise SystemExit(
            "pyscard is not installed. Use the virtualenv you already created:\n"
            "  source ~/acr1311-env/bin/activate\n"
            "  python -m pip install -r tools/desfire/requirements.txt"
        ) from exc

    found = list(readers())
    if not found:
        raise SystemExit("No PC/SC reader found. Plug in the ACR1311 and try again.")
    reader = found[0]
    print(f"Reader: {reader}")
    deadline = time.time() + wait_seconds
    last_error = "No smart card inserted."
    while True:
        connection = reader.createConnection()
        try:
            connection.connect()
            return connection
        except NoCardException:
            last_error = "No smart card inserted."
        except Exception as exc:  # pyscard raises several reader-busy errors
            last_error = str(exc)
        if time.time() >= deadline:
            raise SystemExit(
                f"{last_error}\nLay the DESFire card flat on the ACR1311 logo and run the command again."
            )
        time.sleep(0.4)


def describe(card: Desfire) -> str:
    hardware, software, production = card.get_version()
    uid = production[:7]
    print(f"UID: {_hex(uid)}")
    print(f"Hardware: {_hex(hardware)}")
    print(f"Software: {_hex(software)}")
    card.select_application(b"\x00\x00\x00")
    try:
        settings = card.key_settings()
        crypto = (settings[1] >> 6) & 0x03 if len(settings) > 1 else None
        crypto_name = {0: "2TDEA/DES", 1: "3TDEA", 2: "AES"}.get(crypto, "unknown")
        print(f"PICC key settings: {_hex(settings)} ({crypto_name})")
    except CardError as exc:
        print(f"PICC key settings: unavailable ({exc})")
    apps = card.application_ids()
    if apps:
        print("Applications: " + ", ".join(_hex(app) for app in apps))
    else:
        print("Applications: none (blank card)")
    return uid.hex().upper()


def auth_picc(card: Desfire) -> None:
    card.select_application(b"\x00\x00\x00")
    try:
        card.authenticate_aes(0x00, ZERO_AES)
        print("Authenticated with the factory AES master key.")
        return
    except CardError as exc:
        if exc.status not in (0xAE, 0x7E, 0x1C):
            raise
        print("Factory AES login was rejected. Trying the factory DES master key.")
    card.select_application(b"\x00\x00\x00")
    card.authenticate_legacy_des(0x00, bytes(8))
    print("Authenticated with the factory DES master key.")


def ensure_ndef_app(card: Desfire, reset: bool) -> None:
    apps = card.application_ids()
    if NDEF_AID in apps and reset:
        print("Removing the existing NDEF application.")
        auth_picc(card)
        card.delete_application(NDEF_AID)
        card.select_application(b"\x00\x00\x00")
        apps = card.application_ids()
    if NDEF_AID not in apps:
        print("Creating the NFC Type 4 application.")
        card.select_application(b"\x00\x00\x00")
        try:
            card.create_ndef_application()
        except CardError as exc:
            if exc.status != 0x9D:
                raise
            auth_picc(card)
            card.create_ndef_application()


def burn(card: Desfire, url: str, reset: bool) -> str:
    ndef = build_ndef_file(url)
    size = max(255, len(ndef))
    cc = capability_container(size)
    ensure_ndef_app(card, reset)
    print("Selecting the NDEF application and writing the URL.")
    card.select_application(NDEF_AID)
    card.authenticate_aes(0x00, ZERO_AES)
    # Duplicate (DE) means a previous burn already created the file.
    try:
        card.create_std_file(CC_FILE, CC_ISO, len(cc))
    except CardError as exc:
        if exc.status != 0xDE:
            raise
        card.authenticate_aes(0x00, ZERO_AES)
    else:
        card.write_data(CC_FILE, cc)
    try:
        card.create_std_file(NDEF_FILE, NDEF_ISO, size)
    except CardError as exc:
        if exc.status != 0xDE:
            raise
        card.authenticate_aes(0x00, ZERO_AES)
    card.write_data(NDEF_FILE, ndef)
    if card.session is not None:
        card.select_application(NDEF_AID)
    opened = card.read_ndef_url()
    return opened


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Burn a MediTap profile URL onto a DESFire card.")
    parser.add_argument("--url", default="", help="Profile URL to store, from issue_patient_card.")
    parser.add_argument("--read", action="store_true", help="Read UID, applications, and any NDEF URL.")
    parser.add_argument("--auth-test", action="store_true", help="Check the factory AES key. Does not write.")
    parser.add_argument("--reset", action="store_true", help="Delete the NDEF application before writing.")
    parser.add_argument("--self-test", action="store_true", help="Check crypto and NDEF encoding. No reader.")
    parser.add_argument("--wait", type=float, default=8, help="Seconds to wait for a card.")
    parser.add_argument("--quiet", action="store_true", help="Hide APDU traces.")
    args = parser.parse_args(argv)

    if args.self_test:
        _self_test()
        return 0
    if not args.read and not args.auth_test and not args.url:
        parser.error("Pass --read, --auth-test, --self-test, or --url.")

    connection = connect(args.wait)
    card = Desfire(connection, verbose=not args.quiet)
    try:
        uid = describe(card)
        if args.auth_test:
            auth_picc(card)
            print("Factory AES master key accepted. The card can be personalized.")
            return 0
        if args.read and not args.url:
            try:
                print(f"NDEF URL: {card.read_ndef_url()}")
            except CardError as exc:
                print(f"NDEF URL: not readable yet ({exc})")
            print(f"UID for MediTap bind: {uid}")
            return 0
        print(f"Writing {args.url}")
        opened = burn(card, args.url, args.reset)
        print(f"Card now opens: {opened}")
        print(f"UID for MediTap bind: {uid}")
        if opened.rstrip("/") != args.url.strip().rstrip("/"):
            print("Warning: the URL read back does not match the URL written.")
            return 1
        return 0
    finally:
        try:
            connection.disconnect()
        except Exception:
            pass


if __name__ == "__main__":
    try:
        raise SystemExit(main(sys.argv[1:]))
    except CardError as exc:
        print(f"Card error: {exc}", file=sys.stderr)
        raise SystemExit(1)
