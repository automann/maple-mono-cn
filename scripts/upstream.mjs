export const UPSTREAM_VERSION = "7.9";

export const upstreamAssets = {
  cn: {
    archive: "MapleMono-CN-unhinted.zip",
    font: "MapleMono-CN-Regular.ttf",
    fontSha256: "0fcc5139bfd5ab14ff989bb7dfd5236d0cafc10e60b9828569e6883613ab4085",
    sha256: "d41cb72721e99cfe4fbd1a7b0f182a013457de46aa612018f924dd024699d3b9",
  },
  og: {
    archive: "MapleMono-TTF.zip",
    font: "MapleMono-Regular.ttf",
    fontSha256: "369583f0b555f33bdb6fdbcc2a6840a7a61a1d72c008a57a665baa36d7d5adf6",
    sha256: "3a35f8f0669bef3dded9df208cc4526a6f7573210e134816e9084a8981271d75",
  },
};

export function assetUrl(archive) {
  return `https://github.com/subframe7536/maple-font/releases/download/v${UPSTREAM_VERSION}/${archive}`;
}
