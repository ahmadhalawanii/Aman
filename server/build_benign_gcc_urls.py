import csv, re
from pathlib import Path

GCC_TLDS = (".ae", ".sa", ".qa", ".kw", ".bh", ".om")

RAW = Path("server/data/raw")
OUT = Path("server/data/processed")
OUT.mkdir(parents=True, exist_ok=True)

def is_gcc_domain(d: str) -> bool:
    d = d.strip().lower()
    return any(d.endswith(tld) for tld in GCC_TLDS)

def norm_domain(d: str) -> str:
    d = d.strip().lower()
    d = d.strip(".")
    return d

domains = set()

# 1) Umbrella top-1m.csv -> "rank,domain"
umbrella_path = RAW / "top-1m.csv"
if umbrella_path.exists():
    print(f"Processing {umbrella_path}...")
    with umbrella_path.open("r", encoding="utf-8", errors="ignore") as f:
        for i, line in enumerate(f):
            parts = line.strip().split(",")
            if len(parts) >= 2:
                d = norm_domain(parts[1])
                # Add all GCC domains
                if is_gcc_domain(d):
                    domains.add(d)
                # Add top 20k global domains too to reinforce "clean" patterns
                elif i < 20000:
                    domains.add(d)

# 2) Majestic million -> CSV with "Domain" column
majestic_path = RAW / "majestic_million.csv"
if majestic_path.exists():
    print(f"Processing {majestic_path}...")
    with majestic_path.open("r", encoding="utf-8", errors="ignore") as f:
        reader = csv.reader(f)
        header = next(reader, None)
        for i, row in enumerate(reader):
            if not row:
                continue
            # find a cell that looks like a domain
            domain_found = False
            for cell in row:
                cell = cell.strip().lower()
                if "." in cell and " " not in cell and "/" not in cell:
                    d = norm_domain(cell)
                    if is_gcc_domain(d):
                        domains.add(d)
                        domain_found = True
                    elif i < 20000:
                        domains.add(d)
                        domain_found = True
                    break
            if i > 50000 and not domain_found: # Optimization
                # If we're past 50k and not finding GCC, we might be done with top domains
                # But Majestic is sorted by popularity, so keep going for GCC.
                pass

# 3) UAE official domains
uae_official = RAW / "uae_official_domains.txt"
if uae_official.exists():
    print(f"Processing {uae_official}...")
    for line in uae_official.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        # allow either full URL or domain
        line = line.lower()
        line = re.sub(r"^https?://", "", line)
        line = line.split("/")[0]
        d = norm_domain(line)
        if d:
            domains.add(d)
            # Add common subdomains for these high-value targets
            domains.add("www." + d)
            if "gov.ae" in d:
                domains.add("portal." + d)
                domains.add("services." + d)

# Convert to URLs
urls = sorted({f"https://{d}/" for d in domains})

out_csv = OUT / "benign_urls_gcc.csv"
with out_csv.open("w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["url", "type"])
    for u in urls:
        w.writerow([u, "benign"])

print(f"Wrote {len(urls)} benign GCC + Global URLs -> {out_csv}")
