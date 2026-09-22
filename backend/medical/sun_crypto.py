"""Verify a DESFire EV3 / NTAG 424 SUN tap.

The card puts a fresh encrypted PICC blob and an 8-byte CMAC in the URL on
every read. The server decrypts the blob with the SDM meta-read key and checks
the CMAC with the SDM file-read key. A repeated counter is a replay.

Algorithm: NXP AN12196 section 3.4 (AES, CMAC input offset equal to the MAC
offset, so the MAC covers an empty message). The session key still depends on
the UID and the counter, so the CMAC changes on every tap.
"""

from __future__ import annotations

import hmac
from dataclasses import dataclass


class SunError(ValueError):
    pass


@dataclass(frozen=True)
class SunTap:
    uid: bytes
    read_ctr: int


def _aes_cbc(key: bytes, iv: bytes, data: bytes, *, decrypt: bool) -> bytes:
    try:
        from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

        cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
        ctx = cipher.decryptor() if decrypt else cipher.encryptor()
        return ctx.update(data) + ctx.finalize()
    except ImportError:
        from Crypto.Cipher import AES

        cipher = AES.new(key, AES.MODE_CBC, iv)
        return cipher.decrypt(data) if decrypt else cipher.encrypt(data)


def _cmac(key: bytes, data: bytes) -> bytes:
    try:
        from cryptography.hazmat.primitives.ciphers.algorithms import AES
        from cryptography.hazmat.primitives.cmac import CMAC

        mac = CMAC(AES(key))
        mac.update(data)
        return mac.finalize()
    except ImportError:
        from Crypto.Cipher import AES
        from Crypto.Hash import CMAC

        mac = CMAC.new(key, ciphermod=AES)
        mac.update(data)
        return mac.digest()


def _truncate(mac: bytes) -> bytes:
    return bytes(mac[index] for index in range(1, 16, 2))


def _key(raw: bytes, label: str) -> bytes:
    if len(raw) != 16:
        raise SunError(f"{label} must be 16 bytes.")
    return raw


def session_mac_key(file_read_key: bytes, uid: bytes, read_ctr: bytes) -> bytes:
    """KSesSDMFileReadMAC = CMAC(file read key, SV2). SV2 is zero-padded to 16."""
    sv2 = b"\x3c\xc3\x00\x01\x00\x80" + uid + read_ctr
    if len(sv2) < 16:
        sv2 += b"\x00" * (16 - len(sv2))
    elif len(sv2) > 16:
        # UID (7) + counter (3) + the 6-byte label is exactly one block.
        raise SunError("SV2 is longer than one AES block.")
    return _cmac(file_read_key, sv2)


def sun_cmac(file_read_key: bytes, uid: bytes, read_ctr: bytes) -> bytes:
    key = session_mac_key(file_read_key, uid, read_ctr)
    return _truncate(_cmac(key, b""))


def seal_picc(meta_key: bytes, uid: bytes, read_ctr: int, padding: bytes = b"\x00" * 5) -> str:
    """Encrypt a PICC blob the way the card does. Used by tests."""
    meta_key = _key(meta_key, "Meta-read key")
    if len(uid) != 7 or not 0 <= read_ctr <= 0xFFFFFF or len(padding) != 5:
        raise SunError("PICC plaintext is not 7-byte UID, 3-byte counter, and 5-byte padding.")
    plain = bytes([0xC7]) + uid + read_ctr.to_bytes(3, "little") + padding
    return _aes_cbc(meta_key, bytes(16), plain, decrypt=False).hex().upper()


def open_sun(meta_key: bytes, file_key: bytes, picc_hex: str, cmac_hex: str) -> SunTap:
    meta_key = _key(meta_key, "Meta-read key")
    file_key = _key(file_key, "File-read key")
    try:
        picc = bytes.fromhex((picc_hex or "").strip())
        given = bytes.fromhex((cmac_hex or "").strip())
    except ValueError as exc:
        raise SunError("picc_data or cmac is not hex.") from exc
    if len(picc) != 16 or len(given) != 8:
        raise SunError("picc_data must be 16 bytes and cmac must be 8 bytes.")
    plain = _aes_cbc(meta_key, bytes(16), picc, decrypt=True)
    if plain[0] != 0xC7:
        raise SunError("PICC data is not a 7-byte UID plus counter.")
    uid = plain[1:8]
    read_ctr_bytes = plain[8:11]
    expected = sun_cmac(file_key, uid, read_ctr_bytes)
    if not hmac.compare_digest(expected, given):
        raise SunError("CMAC does not match this tap.")
    read_ctr = int.from_bytes(read_ctr_bytes, "little")
    return SunTap(uid=uid, read_ctr=read_ctr)


def self_check() -> None:
    """AN12196 encrypted-PICC example. Both keys are zeros. Counter is 61."""
    meta = bytes(16)
    file_key = bytes(16)
    opened = open_sun(
        meta,
        file_key,
        "EF963FF7828658A599F3041510671E88",
        "94EED9EE65337086",
    )
    if opened.uid != bytes.fromhex("04DE5F1EACC040") or opened.read_ctr != 0x3D:
        raise SunError("AN12196 SUN vector did not decrypt to the published UID and counter.")
    ses = session_mac_key(file_key, opened.uid, (0x3D).to_bytes(3, "little"))
    if ses != bytes.fromhex("3FB5F6E3A807A03D5E3570ACE393776F"):
        raise SunError("AN12196 session MAC key does not match.")
