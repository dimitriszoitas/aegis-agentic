# FilePreview

Show a supplied file's name, declared MIME type, optional byte size and host-formatted modification date. Supported raster image types render using a native `img`, with a shared Modal lightbox. Failed images fall back to metadata. Alt text defaults to the filename; supply a useful description for meaningful images.

PDF, SVG, HTML, office files and unknown types receive a metadata/download fallback. The component never embeds a document iframe, executes supplied markup, sniffs file contents or fetches a file into JavaScript. A filename or MIME declaration is not proof of content safety.

URLs permit relative paths, HTTP(S), blob URLs and base64 raster image data URLs. Script and arbitrary data schemes are refused. The host owns URL authorization, blob lifecycle, content validation, response MIME and Content-Disposition headers. Native `download` behavior varies for cross-origin resources; the host must supply download-safe endpoints. Links use a separate tab with noopener/noreferrer. Set `download={false}` when the host cannot provide a safe download endpoint.

Modal supplies Escape/outside dismissal, focus management and the dialog name. Rendering an image does not grant access to its source. Remote image requests are made by the browser when a safe URL is supplied. This component provides no PDF viewer, upload, transformation, malware scan or DRM.

FilePreview owns data-display layout/image rules. Its nested Button, Link and Modal retain their category tokens and behavior.
