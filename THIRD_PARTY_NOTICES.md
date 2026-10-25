# Third-party notices

## ZXing Browser 0.2.1

`docs/vendor/zxing-browser.min.js` is the UMD distribution of `@zxing/browser@0.2.1` from the npm registry. The browser wrapper is MIT licensed; the underlying bundled `@zxing/library` is Apache-2.0 licensed. Copies of the licenses are in `docs/vendor/`. The optional source-map reference has been removed; the runtime code is otherwise unchanged.

Upstream: https://github.com/zxing-js/browser and https://github.com/zxing-js/library . The decoder is loaded only when scanning is requested. It does not send camera frames to a remote service.

## Open Food Facts (future backend integration)

The backend starter references Open Food Facts. No database dump or product photographs are bundled. Product lookups, when configured, must retain Open Food Facts attribution and ODbL provenance. Consult https://openfoodfacts.github.io/openfoodfacts-server/api/ and the terms before enabling production usage. External cache data is separated from the original recipe catalogue.

## REA / Mealie

REA/Hermes were research tools, not application dependencies. No proprietary mise source or assets are bundled. No Mealie source is bundled; recipe export uses the public schema.org Recipe format.

## Original project code

No open-source license has been selected for the original project code by the owner. Public GitHub visibility alone is not a grant of a permissive software license. A commercial/open-source licensing choice remains with the owner.
