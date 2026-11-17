"""Motion Mornings test tool, for agents and humans.

Usage (from the repo root):
  python3 tools/mmtest.py check   [--out DIR]       full health check: page errors, every scene in several looks, both kids demos, wording rules
  python3 tools/mmtest.py scene   SPEC [--out FILE] [--scale K]   render scenes; SPEC is JSON [[key, t, p, look, [x, y, w, h]], ...]
  python3 tools/mmtest.py page    URLPATH [--out FILE] [--width W] [--height H] [--full]   screenshot a page at phone size (default 390x844)
  python3 tools/mmtest.py compare BASE_REF SPEC [--out FILE]   before/after: renders SPEC with engine.js from git ref BASE_REF (left) and the working copy (right)

It starts its own local server on port 8765 and serves the fonts locally, so it works without internet.
Output defaults to /tmp/mm-test/.
"""
import argparse, asyncio, json, os, re, subprocess, sys, threading, http.server, functools, urllib.parse, socket

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8765
FONT_DIR = '/tmp/mm-fonts'
OUT = '/tmp/mm-test'


def ensure_fonts():
    base = f'{FONT_DIR}/node_modules/@fontsource'
    if not os.path.isdir(f'{base}/poppins') or not os.path.isdir(f'{base}/figtree'):
        os.makedirs(FONT_DIR, exist_ok=True)
        subprocess.run(['npm', 'install', '--silent', '--prefix', FONT_DIR, '@fontsource/poppins@5', '@fontsource/figtree@5'], check=False)
    return base


async def route_fonts(pg):
    base = ensure_fonts()
    faces = [('Poppins', 'poppins', w, st) for w, st in [(600, 'normal'), (700, 'normal'), (400, 'italic'), (500, 'italic')]] + [('Figtree', 'figtree', w, 'normal') for w in (400, 500, 600, 700)]
    css = ''.join(f"@font-face{{font-family:'{fam}';font-style:{st};font-weight:{w};src:url(https://fonts.gstatic.com/{d}-{w}-{st}.woff2) format('woff2')}}" for fam, d, w, st in faces)

    async def css_route(route):
        await route.fulfill(status=200, content_type='text/css', body=css)

    async def font_route(route):
        name = route.request.url.rsplit('/', 1)[1]
        try:
            d, w, st = name[:-6].split('-')
            body = open(f'{base}/{d}/files/{d}-latin-{w}-{st}.woff2', 'rb').read()
            await route.fulfill(status=200, content_type='font/woff2', body=body)
        except Exception:
            await route.fulfill(status=404, body='')
    await pg.route('https://fonts.googleapis.com/**', css_route)
    await pg.route('https://fonts.gstatic.com/**', font_route)


def serve():
    try:
        with socket.create_connection(('127.0.0.1', PORT), timeout=0.5):
            return  # something is already serving
    except OSError:
        pass
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    handler = functools.partial(Quiet, directory=ROOT)
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()


async def new_page(p, w=390, h=844, scale=2):
    from playwright.async_api import async_playwright  # noqa
    b = await p.chromium.launch()
    pg = await b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=scale)
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'favicon' not in m.text else None)
    await route_fonts(pg)
    return b, pg, errs


async def render_spec(p, spec, out, scale=0.3, engine=None, width=1800):
    b, pg, errs = await new_page(p, width, 600, 1)
    url = f'http://127.0.0.1:{PORT}/tools/render.html?k={scale}&s=' + urllib.parse.quote(json.dumps(spec))
    if engine:
        url += '&engine=' + urllib.parse.quote(engine)
    await pg.goto(url)
    await pg.wait_for_timeout(1200)
    await pg.screenshot(path=out, full_page=True)
    await b.close()
    return errs


LOOKS = {
    'default': {},
    'wheelchair': {'chair': True},
    'dress': {'body': 'f', 'hair': 'long', 'facial': 'none', 'outfit': 'dress'},
    'summer': {'outfit': 'singlet', 'bottoms': 'shorts', 'tattoo': 'both', 'legTat': True, 'ink': 'colour'},
    'skirt-chair': {'body': 'f', 'hair': 'bun', 'facial': 'none', 'outfit': 'tee', 'bottoms': 'skirt', 'chair': True},
}



def wording_check():
    probs = []
    for f in ['index.html', 'you.html', 'kids.html', 'kids.js', 'contact.js', 'engine.js']:
        txt = open(os.path.join(ROOT, f), encoding='utf8').read()
        for i, line in enumerate(txt.splitlines(), 1):
            if '\u2014' in line and '[\u2014' not in line:  # a regex that strips em dashes is fine
                probs.append(f'{f}:{i}: em dash')
            if f in ('kids.html', 'kids.js') and re.search(r'your child\b', line, re.I) and not line.strip().startswith('//'):
                probs.append(f'{f}:{i}: "your child" (keep kids wording generic)')
    return probs


async def check(out):
    from playwright.async_api import async_playwright
    os.makedirs(out, exist_ok=True)
    report = []
    async with async_playwright() as p:
        # 1. pages load at phone size with no errors
        for path in ['/?home=1', '/you.html', '/kids.html']:
            b, pg, errs = await new_page(p)
            await pg.goto(f'http://127.0.0.1:{PORT}{path}')
            await pg.wait_for_timeout(2500)
            name = path.strip('/?=').replace('.html', '').replace('?', '') or 'home'
            await pg.screenshot(path=f'{out}/page-{name}.png')
            report.append((f'page {path}', errs))
            await b.close()
        # 2. every adult scene in each look
        b, pg, errs = await new_page(p, 1800, 600, 1)
        await pg.goto(f'http://127.0.0.1:{PORT}/tools/render.html?k=0.12&s=%5B%5D')
        await pg.wait_for_timeout(500)
        keys = await pg.evaluate('Object.keys(LSN.SCENES)')
        await b.close()
        for name, look in LOOKS.items():
            spec = [[k, 1.3, 0.5, look] for k in keys]
            e = await render_spec(p, spec, f'{out}/scenes-{name}.png', 0.12)
            report.append((f'{len(keys)} scenes, look "{name}"', e))
        # 3. both kids demos, with and without a wheelchair
        for chair in ('0', '1'):
            b, pg, errs = await new_page(p, 1200, 600, 1)
            await pg.goto(f'http://127.0.0.1:{PORT}/tools/render-kids.html?k=0.2&chair={chair}')
            await pg.wait_for_timeout(1500)
            await pg.screenshot(path=f'{out}/kids-demos{"-chair" if chair == "1" else ""}.png', full_page=True)
            report.append((f'kids demos{" (wheelchair)" if chair == "1" else ""}', errs))
            await b.close()
    words = wording_check()
    bad = [(n, e) for n, e in report if e]
    lines = ['Motion Mornings check', '']
    for n, e in report:
        lines.append(f'{"FAIL" if e else "ok  "} {n}' + (f': {e[:3]}' if e else ''))
    lines.append('')
    lines.append('wording: ' + ('ok' if not words else f'{len(words)} problem(s)'))
    lines += ['  ' + w for w in words]
    lines.append('')
    lines.append(f'screenshots in {out}/ (look at them: errors are not the only problems)')
    text = '\n'.join(lines)
    open(f'{out}/report.txt', 'w').write(text)
    print(text)
    return 1 if (bad or words) else 0


async def page_shot(path, out, w, h, full):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b, pg, errs = await new_page(p, w, h)
        await pg.goto(f'http://127.0.0.1:{PORT}{path}')
        await pg.wait_for_timeout(2500)
        await pg.screenshot(path=out, full_page=full)
        await b.close()
        print(errs or 'no errors', '->', out)


async def scene(spec, out, scale):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        e = await render_spec(p, json.loads(spec), out, scale)
        print(e or 'no errors', '->', out)


async def compare(ref, spec, out, scale):
    from playwright.async_api import async_playwright
    old = os.path.join(ROOT, 'tools', '_engine_base.js')
    src = subprocess.run(['git', '-C', ROOT, 'show', f'{ref}:engine.js'], capture_output=True, text=True, check=True).stdout
    open(old, 'w').write(src)
    try:
        async with async_playwright() as p:
            before, after = out.replace('.png', '-before.png'), out.replace('.png', '-after.png')
            e1 = await render_spec(p, json.loads(spec), before, scale, engine='_engine_base.js')
            e2 = await render_spec(p, json.loads(spec), after, scale)
        print('before:', e1 or 'no errors', '->', before)
        print('after: ', e2 or 'no errors', '->', after)
    finally:
        os.remove(old)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['check', 'scene', 'page', 'compare'])
    ap.add_argument('args', nargs='*')
    ap.add_argument('--out')
    ap.add_argument('--scale', type=float, default=0.3)
    ap.add_argument('--width', type=int, default=390)
    ap.add_argument('--height', type=int, default=844)
    ap.add_argument('--full', action='store_true')
    a = ap.parse_args()
    serve()
    if a.cmd == 'check':
        sys.exit(asyncio.run(check(a.out or OUT)))
    os.makedirs(OUT, exist_ok=True)
    if a.cmd == 'scene':
        asyncio.run(scene(a.args[0], a.out or f'{OUT}/scene.png', a.scale))
    elif a.cmd == 'page':
        asyncio.run(page_shot(a.args[0], a.out or f'{OUT}/page.png', a.width, a.height, a.full))
    elif a.cmd == 'compare':
        asyncio.run(compare(a.args[0], a.args[1], a.out or f'{OUT}/compare.png', a.scale))


if __name__ == '__main__':
    main()
