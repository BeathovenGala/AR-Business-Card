"""Local server for the AR Business Card. Run: python server.py  then open http://localhost:8080"""
import http.server
import pathlib
import sys
import webbrowser

ROOT = pathlib.Path(__file__).resolve().parent
TARGET_FILE = ROOT / "assets" / "targets.mind"
MAX_UPLOAD = 20 * 1024 * 1024
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    # No caching, so edits to the app show up on a normal reload.
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    # Only used by tools/compile.html to save a freshly compiled marker file.
    def do_POST(self):
        if self.path != "/save-target":
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length", 0))
        if not 0 < length <= MAX_UPLOAD:
            self.send_error(413)
            return
        TARGET_FILE.write_bytes(self.rfile.read(length))
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"saved")


if __name__ == "__main__":
    # Threaded: browsers open several connections at once and a single-threaded server stalls on them.
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler) as httpd:
        url = f"http://localhost:{PORT}"
        print(f"AR Business Card running at {url}  (Ctrl+C to stop)")
        if "--no-browser" not in sys.argv:
            webbrowser.open(url)
        httpd.serve_forever()
