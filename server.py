#!/usr/bin/env python3
"""Love Journal - 本地服务器 + GitHub API 代理
绕过浏览器直连 api.github.com 被墙的问题
"""
import http.server
import urllib.request
import urllib.error
import json
import ssl
import os

ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    # ---- CORS 预检 ----
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()

    # ---- 代理端点 ----
    def do_POST(self):
        if self.path == '/proxy':
            self._handle_proxy()
        else:
            self.send_response(404)
            self.end_headers()

    def do_PUT(self):
        if self.path == '/proxy':
            self._handle_proxy()
        else:
            self.send_response(404)
            self.end_headers()

    def _handle_proxy(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(length))
        except Exception:
            self.send_response(400)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            return

        url = body['url']
        method = body.get('method', 'GET')
        req_headers = dict(body.get('headers', {}))
        req_body = body.get('body', None)

        for h in ('Host', 'Content-Length', 'Connection', 'Accept-Encoding'):
            req_headers.pop(h, None)

        data = None
        if req_body is not None:
            if isinstance(req_body, str):
                data = req_body.encode('utf-8')
            else:
                data = json.dumps(req_body).encode('utf-8')

        req = urllib.request.Request(url, data=data, method=method)
        for k, v in req_headers.items():
            req.add_header(k, v)

        try:
            ctx = ssl.create_default_context()
            opener = urllib.request.build_opener(urllib.request.HTTPSHandler(context=ctx))
            with opener.open(req, timeout=30) as resp:
                resp_body = resp.read()
                self.send_response(resp.status)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Type',
                                 resp.headers.get('Content-Type', 'application/json'))
                self.end_headers()
                self.wfile.write(resp_body)
        except urllib.error.HTTPError as e:
            err_body = e.read()
            self.send_response(e.code)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(err_body)
        except Exception as e:
            print(f'[proxy] ERROR: {e}')
            err = json.dumps({'error': str(e), 'hint': 'Cannot reach GitHub API'})
            self.send_response(502)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(err.encode('utf-8'))

    def log_message(self, fmt, *args):
        print(f'[server] {args[0]}')


if __name__ == '__main__':
    port = 8080
    print(f'Love Journal → http://localhost:{port}')
    print(f'GitHub proxy → POST /proxy')
    httpd = http.server.HTTPServer(('127.0.0.1', port), Handler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nBye')
        httpd.shutdown()
