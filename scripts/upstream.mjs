export const UPSTREAM_VERSION = "7.9";

export const upstreamAssets = {
  cn: {
    archive: "MapleMono-CN-unhinted.zip",
    sha256: "d41cb72721e99cfe4fbd1a7b0f182a013457de46aa612018f924dd024699d3b9",
    fonts: [
      {
        name: "Thin",
        slug: "thin",
        weight: 100,
        font: "MapleMono-CN-Thin.ttf",
        fontSha256: "e90ba601602defd94ea86f059f58e31df2844a98d47baaa7ec5ee3beb3c38cbd",
      },
      {
        name: "ExtraLight",
        slug: "extra-light",
        weight: 200,
        font: "MapleMono-CN-ExtraLight.ttf",
        fontSha256: "cb6b80afef8e79168977f25d89cef7e87fd3c12399316f543d38622ce39185cc",
      },
      {
        name: "Light",
        slug: "light",
        weight: 300,
        font: "MapleMono-CN-Light.ttf",
        fontSha256: "dc05ab233fe76a1cee10463a610a1a707409dacd97bfa104b3452a9ed36fded3",
      },
      {
        name: "Regular",
        slug: "regular",
        weight: 400,
        font: "MapleMono-CN-Regular.ttf",
        fontSha256: "0fcc5139bfd5ab14ff989bb7dfd5236d0cafc10e60b9828569e6883613ab4085",
      },
      {
        name: "Medium",
        slug: "medium",
        weight: 500,
        font: "MapleMono-CN-Medium.ttf",
        fontSha256: "fee9d51498dfcba0921494ac774ad9a374021cf45cfcdf33188ce6421b90c050",
      },
    ],
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
