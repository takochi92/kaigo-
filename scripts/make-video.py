# sns/video/frames のコマ画像から、話ごとの縦長動画（無音、音楽はアプリで付ける）を作る
import glob, os, subprocess
HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "sns", "video")
OUT = HERE
os.chdir(HERE)
for ep in ["ep1", "ep2", "ep3", "ep4"]:
    fs = sorted(glob.glob(f"frames/{ep}-*.png"))
    durs = [2.5] + [4.5] * (len(fs) - 2) + [5.0]
    T = 0.4
    cmd = ["ffmpeg", "-y", "-loglevel", "error"]
    for f, d in zip(fs, durs):
        cmd += ["-loop", "1", "-t", str(d + T), "-i", f]
    cmd += ["-f", "lavfi", "-t", str(sum(durs) + T), "-i", "anullsrc=r=44100:cl=stereo"]
    parts = [f"[{i}:v]scale=1080:1920,format=yuv420p,setsar=1,fps=30[v{i}]" for i in range(len(fs))]
    prev, off = "v0", 0.0
    for i in range(1, len(fs)):
        off += durs[i - 1]
        parts.append(f"[{prev}][v{i}]xfade=transition=fade:duration={T}:offset={off - T * 0 :.2f}[x{i}]")
        prev = f"x{i}"
    cmd += ["-filter_complex", ";".join(parts), "-map", f"[{prev}]", "-map", f"{len(fs)}:a",
            "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "96k", "-shortest", "-movflags", "+faststart", f"{OUT}/{ep}.mp4"]
    subprocess.run(cmd, check=True)
    print(ep, round(sum(durs), 1), "秒")
