#!/usr/bin/env python3
"""Tiny static HTTP server for the WeChat viewer.

Usage:
    python3 server.py             # listens on 0.0.0.0:8080
    python3 server.py 9000        # custom port
    PORT=9000 python3 server.py   # via env var

Then point your phone to:
    http://<server-ip>:8080/
"""
import http.server
import socketserver
import os
import sys
import socket


def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


PORT = int(os.environ.get("PORT", sys.argv[1] if len(sys.argv) > 1 else 8080))
ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".json": "application/json; charset=utf-8",
        ".silk": "audio/silk",
        ".amr": "audio/amr",
        ".m4a": "audio/mp4",
        ".webp": "image/webp",
        ".heic": "image/heic",
        ".mp4": "video/mp4",
        ".mov": "video/quicktime",
        ".svg": "image/svg+xml",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def log_message(self, fmt, *args):
        # quieter logs
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


def main():
    ip = get_local_ip()
    print(f"\n  微信查看器 listening on:")
    print(f"    http://localhost:{PORT}/")
    print(f"    http://{ip}:{PORT}/         (同网段手机扫此地址)")
    print(f"    http://0.0.0.0:{PORT}/      (绑定全部网卡)\n")
    print(f"  ROOT={ROOT}")
    print(f"  按 Ctrl+C 退出\n")
    with ReusableTCPServer(("0.0.0.0", PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  bye")


if __name__ == "__main__":
    main()
