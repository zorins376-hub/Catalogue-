# gs-container — CMYK conversion (ТЗ §7)

A tiny HTTP service that converts an RGB PDF (from the RGB render pipeline) into a
print-ready **DeviceCMYK** PDF with **TrimBox/BleedBox** stamped from the bleed
box. Runs as a Cloudflare Container; the API Worker calls it for `kind: "cmyk"`
exports.

## API

```
GET  /health                                            → "ok"
POST /convert?mediaWmm=216&mediaHmm=303&bleedMm=3        body: application/pdf
     → application/pdf (CMYK, with TrimBox/BleedBox)
```

Geometry defaults to A4 + 3 mm bleed (216×303 mm). TrimBox is the finished page
(media minus bleed); BleedBox is the full media box. Crop marks are **not** drawn
— the boxes let the printer place them (ТЗ §5).

## Ghostscript command

```
gs -q -dSAFER -dBATCH -dNOPAUSE -sDEVICE=pdfwrite \
   -dProcessColorModel=/DeviceCMYK -sColorConversionStrategy=CMYK \
   -dAutoRotatePages=/None \
   [ -sOutputICCProfile=CoatedFOGRA39.icc -dOverrideICC=true ]   # when profile present
   -o out.pdf \
   -c "[ /TrimBox [...] /BleedBox [...] /PAGES pdfmark" \
   -f in.pdf
```

The `/PAGES` pdfmark sets the boxes on the page tree, inherited by every page.

## ICC profile

A **Coated FOGRA39** ICC profile gives a real output intent. It is not committed
(licensing); bake it in at build time (see the Dockerfile) or mount it at
`ICC_PROFILE_PATH`. Without it, Ghostscript's default CMYK conversion is used.

## Local run

```bash
node server.mjs                 # needs ghostscript on PATH
curl -X POST 'http://localhost:8080/convert?mediaWmm=216&mediaHmm=303&bleedMm=3' \
     --data-binary @rgb.pdf -o cmyk.pdf
```

## Deploy (Cloudflare Containers)

Configured from `apps/api/wrangler.toml` (`[[containers]]` + a Durable Object
binding). The Worker reaches it through the `GS_CONTAINER` binding.
