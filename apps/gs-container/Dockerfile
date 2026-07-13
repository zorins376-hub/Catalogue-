# Ghostscript CMYK conversion service for Cloudflare Containers (ТЗ §7).
FROM node:22-slim

# Ghostscript does the RGB→CMYK conversion + box stamping.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ghostscript \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY server.mjs ./

# Optional: bake a Coated FOGRA39 ICC profile in for a real output intent.
# It is kept out of the repo for licensing; provide it at build/deploy time:
#   COPY icc/CoatedFOGRA39.icc /opt/icc/CoatedFOGRA39.icc
ENV PORT=8080
ENV ICC_PROFILE_PATH=/opt/icc/CoatedFOGRA39.icc

EXPOSE 8080
CMD ["node", "server.mjs"]
