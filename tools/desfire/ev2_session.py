"""DESFire EV2 / NTAG 424 secure messaging for SDM setup.

The burn script uses this only to turn on Secure Dynamic Messaging and to
replace the application key. Command encryption and the truncated CMAC follow
NXP AN12196 sections 5.6, 5.9, and 5.16.
"""

from __future__ import annotations

from dataclasses import dataclass

from Crypto.Cipher import AES
from Crypto.Hash import CMAC


class Ev2Error(RuntimeError):
    pass


def _cmac(key: bytes, data: bytes) -> bytes:
    mac = CMAC.new(key, ciphermod=AES)
    mac.update(data)
    return mac.digest()


def _truncate(mac: bytes) -> bytes:
    return bytes(mac[index] for index in range(1, 16, 2))


def _cbc(key: bytes, iv: bytes, data: bytes, *, decrypt: bool) -> bytes:
    cipher = AES.new(key, AES.MODE_CBC, iv)
    return cipher.decrypt(data) if decrypt else cipher.encrypt(data)


def _ecb(key: bytes, block: bytes) -> bytes:
    return AES.new(key, AES.MODE_ECB).encrypt(block)


def pad_80(data: bytes) -> bytes:
    padded = data + b"\x80"
    if len(padded) % 16:
        padded += b"\x00" * (16 - (len(padded) % 16))
    return padded


def derive_session_keys(key: bytes, rnd_a: bytes, rnd_b: bytes) -> tuple[bytes, bytes]:
    """Return (encryption key, MAC key) for an EV2 authentication."""
    if len(key) != 16 or len(rnd_a) != 16 or len(rnd_b) != 16:
        raise Ev2Error("EV2 session derivation needs 16-byte key, RndA, and RndB.")
    mixed = bytes(left ^ right for left, right in zip(rnd_a[2:8], rnd_b[0:6]))
    tail = rnd_a[0:2] + mixed + rnd_b[6:16] + rnd_a[8:16]
    enc = _cmac(key, b"\xa5\x5a\x00\x01\x00\x80" + tail)
    mac = _cmac(key, b"\x5a\xa5\x00\x01\x00\x80" + tail)
    return enc, mac


@dataclass
class Ev2Session:
    enc_key: bytes
    mac_key: bytes
    ti: bytes
    counter: int = 0

    def wrap(self, code: int, header: bytes, plain: bytes) -> bytes:
        """Encrypt plain and return header || ciphertext || truncated CMAC.

        header is sent in the clear (file number, or the key number) and is
        part of the CMAC input. plain must already be padded to a block.
        """
        if len(self.ti) != 4 or len(plain) % 16:
            raise Ev2Error("EV2 session is missing TI or the plaintext is not block-aligned.")
        iv_input = b"\xa5\x5a" + self.ti + self.counter.to_bytes(2, "little") + bytes(8)
        iv = _ecb(self.enc_key, iv_input)
        ciphertext = _cbc(self.enc_key, iv, plain, decrypt=False)
        mac_input = bytes([code]) + self.counter.to_bytes(2, "little") + self.ti + header + ciphertext
        truncated = _truncate(_cmac(self.mac_key, mac_input))
        self.counter += 1
        return header + ciphertext + truncated


def decrypt_auth_response(key: bytes, rnd_a: bytes, response: bytes) -> bytes:
    """Decrypt the second AuthenticateEV2First frame and return the 4-byte TI."""
    plain = _cbc(key, bytes(16), response, decrypt=True)
    rotated = rnd_a[1:] + rnd_a[:1]
    if len(plain) < 20 or plain[4:20] != rotated:
        raise Ev2Error("EV2 authentication response did not contain the expected RndA.")
    return plain[:4]


def self_check() -> None:
    """AN12196 AuthenticateEV2First, ChangeFileSettings, and ChangeKey vectors."""
    key = bytes(16)
    rnd_a = bytes.fromhex("13C5DB8A5930439FC3DEF9A4C675360F")
    rnd_b = bytes.fromhex("B9E2FC789B64BF237CCCAA20EC7E6E48")
    response = bytes.fromhex(
        "3FA64DB5446D1F34CD6EA311167F5E4985B89690C04A05F17FA7AB2F08120663"
    )
    ti = decrypt_auth_response(key, rnd_a, response)
    if ti != bytes.fromhex("9D00C4DF"):
        raise Ev2Error("AuthenticateEV2First vector did not yield the published TI.")
    enc, mac = derive_session_keys(key, rnd_a, rnd_b)
    if enc != bytes.fromhex("1309C877509E5A215007FF0ED19CA564"):
        raise Ev2Error("EV2 encryption session key does not match AN12196.")
    if mac != bytes.fromhex("4C6626F5E72EA694202139295C7A7FC7"):
        raise Ev2Error("EV2 MAC session key does not match AN12196.")

    session = Ev2Session(enc_key=enc, mac_key=mac, ti=ti, counter=1)
    settings = pad_80(bytes.fromhex("4000E0C1F121200000430000430000"))
    wrapped = session.wrap(0x5F, bytes.fromhex("02"), settings)
    if wrapped != bytes.fromhex("0261B6D97903566E84C3AE5274467E89EAD799B7C1A0EF7A04"):
        raise Ev2Error("ChangeFileSettings vector does not match AN12196.")

    change = Ev2Session(
        enc_key=bytes.fromhex("4CF3CB41A22583A61E89B158D252FC53"),
        mac_key=bytes.fromhex("5529860B2FC5FB6154B7F28361D30BF9"),
        ti=bytes.fromhex("7614281A"),
        counter=3,
    )
    new_key = bytes.fromhex("5004BF991F408672B1EF00F08F9E8647")
    key_plain = pad_80(new_key + bytes([0x01]))
    wrapped_key = change.wrap(0xC4, bytes.fromhex("00"), key_plain)
    expected = bytes.fromhex(
        "00C0EB4DEEFEDDF0B513A03A95A75491818580503190D4D05053FF75668A01D6FDA6610234BDED6432"
    )
    if wrapped_key != expected:
        raise Ev2Error("ChangeKey vector does not match AN12196.")
