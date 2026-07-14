import busboy from "busboy";

export function parseMultipartFields(req, res, next) {
  const ct = req.headers["content-type"] || "";
  if (!ct.startsWith("multipart/form-data")) return next();

  let bb;
  try {
    bb = busboy({ headers: req.headers, limits: { fields: 200, fieldSize: 512 * 1024, files: 0 } });
  } catch {
    return res.status(400).json({ error: "Malformed multipart payload" });
  }

  const body = {};
  let done = false;
  const finish = (fn) => {
    if (done) return;
    done = true;
    fn();
  };

  bb.on("field", (name, value) => { body[name] = value; });
  bb.on("file", (_name, stream) => stream.resume());
  bb.on("error", () =>
    finish(() => {
      if (!res.headersSent) res.status(400).json({ error: "Malformed multipart payload" });
    })
  );
  bb.on("close", () =>
    finish(() => {
      req.body = body;
      next();
    })
  );
  req.pipe(bb);
}
