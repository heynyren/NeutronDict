# Locked Kuromoji package; runs in GitHub Actions, never at extension runtime.
import base64, hashlib, io, json, sys, tarfile, urllib.request
from pathlib import Path
URL = "https://registry.npmjs.org/kuromoji/-/kuromoji-0.1.2.tgz"
INTEGRITY = "V0dUf+C2LpcPEXhoHLMAop/bOht16Dyr+mDiIE39yX3vqau7p80De/koFqpiTcL1zzdZlc3xuHZ8u5gjYRfFaQ=="
raw = urllib.request.urlopen(URL, timeout=60).read()
assert base64.b64encode(hashlib.sha512(raw).digest()).decode() == INTEGRITY, "Kuromoji integrity mismatch"
root = Path("extension/vendor/kuromoji")
files = {}
with tarfile.open(fileobj=io.BytesIO(raw), mode="r:gz") as archive:
    for member in archive.getmembers():
        name = member.name.removeprefix("package/")
        if name not in ("build/kuromoji.js", "LICENSE-2.0.txt", "NOTICE.md") and not (name.startswith("dict/") and name.endswith(".dat.gz")): continue
        assert member.isfile() and ".." not in Path(name).parts
        data = archive.extractfile(member).read()
        target = root / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        files[name] = hashlib.sha256(data).hexdigest()
assert len([x for x in files if x.startswith("dict/")]) == 12
(root / "INTEGRITY.json").write_text(json.dumps({"version":"0.1.2","url":URL,"integrity":"sha512-"+INTEGRITY,"sha256":files}, indent=2)+"\n")
print("Vendored", len(files), "locked Kuromoji files")
