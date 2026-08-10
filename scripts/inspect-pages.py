#!/usr/bin/env python3
import re
import urllib.request

PAGES = [
    "hollow-hold",
    "wall-sit",
    "cable-half-kneeling-pallof-press",
    "cat-cow-pose",
    "double-pigeon-pose",
    "parsva-balasana-thread-the-needle-pose",
]


def inspect(page: str) -> None:
    url = f"https://fitnessprogramer.com/exercise/{page}/"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        html = resp.read().decode("utf-8", "ignore")
    gifs = re.findall(r"https://fitnessprogramer\.com/wp-content/uploads/[^\s\"']+\.gif", html)
    videos = re.findall(r"https://fitnessprogramer\.com/wp-content/uploads/[^\s\"']+\.(?:mp4|webm)", html)
    imgs = re.findall(r"https://fitnessprogramer\.com/wp-content/uploads/[^\s\"']+\.(?:png|jpg|jpeg|webp)", html)
    print("PAGE", page)
    print(" gifs", gifs[:5])
    print(" videos", videos[:5])
    print(" imgs", imgs[:8])


for page in PAGES:
    try:
        inspect(page)
    except Exception as exc:
        print(page, "ERR", exc)
