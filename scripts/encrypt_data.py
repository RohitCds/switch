#!/usr/bin/env python3
"""
Zero-Knowledge AES-256-GCM Data Encryption for Switch Flashcards.

Encrypts or decrypts all JSON files in the `generated/` directory using
AES-256-GCM authenticated encryption with PBKDF2-HMAC-SHA256 key derivation.

Zero pip dependencies: uses macOS/Linux native libcrypto via ctypes.

Usage:
  python3 scripts/encrypt_data.py
  python3 scripts/encrypt_data.py --password "your_secret_password"
  python3 scripts/encrypt_data.py --decrypt --password "your_secret_password"
"""

import argparse
import base64
import ctypes
import ctypes.util
import getpass
import hashlib
import json
import os
import sys
from pathlib import Path

# Load native libcrypto
_lib_path = ctypes.util.find_library("crypto")
if not _lib_path:
    print("Error: OpenSSL libcrypto library not found.", file=sys.stderr)
    sys.exit(1)

_lib = ctypes.CDLL(_lib_path)

# OpenSSL C-types bindings
_EVP_CIPHER_CTX_new = _lib.EVP_CIPHER_CTX_new
_EVP_CIPHER_CTX_new.restype = ctypes.c_void_p

_EVP_CIPHER_CTX_free = _lib.EVP_CIPHER_CTX_free
_EVP_CIPHER_CTX_free.argtypes = [ctypes.c_void_p]

_EVP_aes_256_gcm = _lib.EVP_aes_256_gcm
_EVP_aes_256_gcm.restype = ctypes.c_void_p

_EVP_EncryptInit_ex = _lib.EVP_EncryptInit_ex
_EVP_EncryptInit_ex.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_char_p, ctypes.c_char_p]
_EVP_EncryptInit_ex.restype = ctypes.c_int

_EVP_EncryptUpdate = _lib.EVP_EncryptUpdate
_EVP_EncryptUpdate.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.POINTER(ctypes.c_int), ctypes.c_char_p, ctypes.c_int]
_EVP_EncryptUpdate.restype = ctypes.c_int

_EVP_EncryptFinal_ex = _lib.EVP_EncryptFinal_ex
_EVP_EncryptFinal_ex.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.POINTER(ctypes.c_int)]
_EVP_EncryptFinal_ex.restype = ctypes.c_int

_EVP_DecryptInit_ex = _lib.EVP_DecryptInit_ex
_EVP_DecryptInit_ex.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_char_p, ctypes.c_char_p]
_EVP_DecryptInit_ex.restype = ctypes.c_int

_EVP_DecryptUpdate = _lib.EVP_DecryptUpdate
_EVP_DecryptUpdate.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.POINTER(ctypes.c_int), ctypes.c_char_p, ctypes.c_int]
_EVP_DecryptUpdate.restype = ctypes.c_int

_EVP_DecryptFinal_ex = _lib.EVP_DecryptFinal_ex
_EVP_DecryptFinal_ex.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.POINTER(ctypes.c_int)]
_EVP_DecryptFinal_ex.restype = ctypes.c_int

_EVP_CIPHER_CTX_ctrl = _lib.EVP_CIPHER_CTX_ctrl
_EVP_CIPHER_CTX_ctrl.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_int, ctypes.c_void_p]
_EVP_CIPHER_CTX_ctrl.restype = ctypes.c_int

EVP_CTRL_AEAD_GET_TAG = 0x10
EVP_CTRL_AEAD_SET_TAG = 0x11
PBKDF2_ITERATIONS = 100000


def derive_key(password: str, salt: bytes) -> bytes:
    """Derive 256-bit AES key using PBKDF2-HMAC-SHA256 (100,000 iterations)."""
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS, dklen=32)


def encrypt_aes_gcm(plaintext: bytes, key: bytes, iv: bytes) -> bytes:
    """Encrypts plaintext with AES-256-GCM. Returns ciphertext + 16-byte auth tag."""
    ctx = _EVP_CIPHER_CTX_new()
    try:
        cipher = _EVP_aes_256_gcm()
        if not _EVP_EncryptInit_ex(ctx, cipher, None, key, iv):
            raise RuntimeError("Failed to initialize AES-GCM encryption context.")

        out_buf = ctypes.create_string_buffer(len(plaintext) + 16)
        out_len = ctypes.c_int(0)
        if not _EVP_EncryptUpdate(ctx, ctypes.byref(out_buf), ctypes.byref(out_len), plaintext, len(plaintext)):
            raise RuntimeError("AES-GCM encryption update failed.")

        final_len = ctypes.c_int(0)
        ptr = ctypes.byref(out_buf, out_len.value)
        if not _EVP_EncryptFinal_ex(ctx, ptr, ctypes.byref(final_len)):
            raise RuntimeError("AES-GCM encryption finalization failed.")

        tag = ctypes.create_string_buffer(16)
        if not _EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_AEAD_GET_TAG, 16, tag):
            raise RuntimeError("Failed to retrieve AES-GCM auth tag.")

        return out_buf.raw[: out_len.value + final_len.value] + tag.raw
    finally:
        _EVP_CIPHER_CTX_free(ctx)


def decrypt_aes_gcm(ciphertext_with_tag: bytes, key: bytes, iv: bytes) -> bytes:
    """Decrypts ciphertext with AES-256-GCM verifying the 16-byte auth tag."""
    if len(ciphertext_with_tag) < 16:
        raise ValueError("Invalid ciphertext length.")

    ciphertext = ciphertext_with_tag[:-16]
    tag = ciphertext_with_tag[-16:]

    ctx = _EVP_CIPHER_CTX_new()
    try:
        cipher = _EVP_aes_256_gcm()
        if not _EVP_DecryptInit_ex(ctx, cipher, None, key, iv):
            raise RuntimeError("Failed to initialize AES-GCM decryption context.")

        tag_buf = ctypes.create_string_buffer(tag, 16)
        if not _EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_AEAD_SET_TAG, 16, tag_buf):
            raise RuntimeError("Failed to set AES-GCM auth tag for verification.")

        out_buf = ctypes.create_string_buffer(len(ciphertext) + 16)
        out_len = ctypes.c_int(0)
        if not _EVP_DecryptUpdate(ctx, ctypes.byref(out_buf), ctypes.byref(out_len), ciphertext, len(ciphertext)):
            raise RuntimeError("AES-GCM decryption update failed.")

        final_len = ctypes.c_int(0)
        ptr = ctypes.byref(out_buf, out_len.value)
        if not _EVP_DecryptFinal_ex(ctx, ptr, ctypes.byref(final_len)):
            raise ValueError("Authentication verification failed: incorrect password or corrupted ciphertext.")

        return out_buf.raw[: out_len.value + final_len.value]
    finally:
        _EVP_CIPHER_CTX_free(ctx)


def encrypt_file(file_path: Path, password: str) -> bool:
    """Encrypts a single JSON file in-place."""
    raw_content = file_path.read_text(encoding="utf-8")
    try:
        data_obj = json.loads(raw_content)
        if isinstance(data_obj, dict) and data_obj.get("encrypted") is True:
            return False  # Already encrypted
    except Exception:
        pass

    salt = os.urandom(16)
    iv = os.urandom(12)
    key = derive_key(password, salt)
    encrypted_bytes = encrypt_aes_gcm(raw_content.encode("utf-8"), key, iv)

    envelope = {
        "encrypted": True,
        "v": 1,
        "salt": base64.b64encode(salt).decode("ascii"),
        "iv": base64.b64encode(iv).decode("ascii"),
        "data": base64.b64encode(encrypted_bytes).decode("ascii"),
    }

    file_path.write_text(json.dumps(envelope, indent=2), encoding="utf-8")
    return True


def decrypt_file(file_path: Path, password: str) -> bool:
    """Decrypts a single JSON file in-place."""
    raw_content = file_path.read_text(encoding="utf-8")
    try:
        envelope = json.loads(raw_content)
    except Exception:
        return False

    if not isinstance(envelope, dict) or envelope.get("encrypted") is not True:
        return False  # Already plaintext

    salt = base64.b64decode(envelope["salt"])
    iv = base64.b64decode(envelope["iv"])
    data = base64.b64decode(envelope["data"])
    key = derive_key(password, salt)

    plaintext_bytes = decrypt_aes_gcm(data, key, iv)
    parsed = json.loads(plaintext_bytes.decode("utf-8"))
    file_path.write_text(json.dumps(parsed, indent=2), encoding="utf-8")
    return True


def main():
    parser = argparse.ArgumentParser(description="Encrypt or decrypt generated flashcard JSON files.")
    parser.add_argument("--password", "-p", help="Master encryption/decryption password.")
    parser.add_argument("--decrypt", "-d", action="store_true", help="Decrypt files back to plaintext.")
    parser.add_argument("--dir", default="generated", help="Directory containing JSON files (default: generated).")
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent.parent
    target_dir = (project_root / args.dir).resolve()

    if not target_dir.exists():
        print(f"Error: Directory '{target_dir}' not found.", file=sys.stderr)
        sys.exit(1)

    password = args.password
    if not password:
        password = os.environ.get("SWITCH_PASSWORD")
    if not password:
        action_name = "decryption" if args.decrypt else "encryption"
        password = getpass.getpass(f"Enter master {action_name} password: ")
        if not password:
            print("Error: Password cannot be empty.", file=sys.stderr)
            sys.exit(1)

    json_files = sorted(target_dir.glob("*.json"))
    if not json_files:
        print(f"No JSON files found in {target_dir}")
        return

    mode_label = "Decrypting" if args.decrypt else "Encrypting"
    print(f"\n🔐 {mode_label} {len(json_files)} files in {target_dir.name}/ ...")

    count = 0
    for file_path in json_files:
        try:
            if args.decrypt:
                if decrypt_file(file_path, password):
                    print(f"  ✓ Decrypted: {file_path.name}")
                    count += 1
                else:
                    print(f"  - Skipped (already plaintext): {file_path.name}")
            else:
                if encrypt_file(file_path, password):
                    print(f"  🔒 Encrypted: {file_path.name}")
                    count += 1
                else:
                    print(f"  - Skipped (already encrypted): {file_path.name}")
        except Exception as err:
            print(f"  ✗ Failed on {file_path.name}: {err}", file=sys.stderr)
            sys.exit(1)

    action_done = "decrypted" if args.decrypt else "encrypted"
    print(f"\n✨ Successfully {action_done} {count} files with AES-256-GCM.")


if __name__ == "__main__":
    main()
