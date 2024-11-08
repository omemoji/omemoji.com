"use client";
import "./admin.css";
import Form, { IChangeEvent } from "@rjsf/core";
import { RJSFSchema, UiSchema } from "@rjsf/utils";
import validator from "@rjsf/validator-ajv8";
import { ArtworkData } from "lib/interface";
import React, { ChangeEvent } from "react";

const IMAGE_PATH = "/images/artworks/";
const ENDPOINT = "http://localhost:3001/artworks";

const schema: RJSFSchema = {
  title: "作品投稿フォーム",
  type: "object",
  required: ["id", "src", "title"],
  properties: {
    id: { type: "string", default: "" },
    src: { type: "string", title: "画像" },
    title: { type: "string", title: "タイトル" },
    tag: {
      type: "array",
      items: {
        type: "string",
        minItems: 1,
      },
      title: "タグ",
    },
    href: { type: "string", title: "リンク" },
    description: { type: "string", title: "説明" },
  },
};

const uiSchema: UiSchema = {
  id: {
    "ui:widget": "hidden",
  },
  items: {
    "ui:widget": "textarea",
  },
  src: {
    "ui:widget": "file",
    "ui:options": {
      filePreview: true,
      accept: [".png", ".jpg", ".jpeg", ".gif", "webp", ".svg", "avif"],
    },
  },
};

const newArtworkData: ArtworkData = {
  id: "",
  src: "",
  title: "",
  tag: [],
  href: "",
  description: "",
};

async function base64ToFile(base64: string, filename: string) {
  const res = await fetch(base64);
  const blob = await res.blob();
  const file = new File([blob], filename, { type: blob.type });
  return file;
}

async function addArtwork(e: IChangeEvent) {
  const fileName = e.formData.src.split(";")[1].split("name=")[1];
  e.formData.id = fileName.split(".")[0];
  e.formData.src = IMAGE_PATH + fileName;
  await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(e.formData),
  });
}

async function deleteArtwork(e: any, artwork: ArtworkData) {
  await fetch(ENDPOINT + "/" + artwork.id, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export default function AdminPage() {
  const [formData, setFormData] = React.useState(newArtworkData);
  const [artworks, setArtworks] = React.useState([newArtworkData]);
  const [page, setPage] = React.useState(1);
  const perPage = 10;
  React.useEffect(() => {
    (async () => {
      const res = await fetch(ENDPOINT);
      const data = await res.json();
      setArtworks(data.reverse());
    })();
  }, []);
  return (
    <>
      <Form
        className="mb-8"
        schema={schema}
        uiSchema={uiSchema}
        formData={formData}
        validator={validator}
        onChange={(e) => {
          setFormData(e.formData);
        }}
        onSubmit={async (e) => {
          addArtwork(e);
          setArtworks([e.formData, ...artworks]);
          setFormData(newArtworkData);
        }}
      />

      <div id="root__title">作品一覧</div>
      <select
        onChange={(e: ChangeEvent) => {
          setPage(parseInt((e.target as HTMLSelectElement).value));
        }}
      >
        {Array.from(
          { length: Math.ceil(artworks.length / perPage) },
          (_, i) => i
        ).map((i) => (
          <option key={i} value={i + 1}>
            {i * perPage + 1} - {Math.min((i + 1) * perPage, artworks.length)}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2">
        {artworks
          .filter(
            (artwork) =>
              artworks.indexOf(artwork) / perPage < page &&
              artworks.indexOf(artwork) / perPage >= page - 1
          )
          .map((artwork) => (
            <div key={artwork.id} className="w-full inline-flex border p-2">
              <div className="mr-auto mt-auto mb-auto overflow-hidden">
                {artwork.title}
              </div>
              <img
                src={artwork.src}
                className="h-20 mt-auto mb-auto mr-2"
                loading="lazy"
              />
              <button
                className="border-2 bg-white hover:text-white text-red-600 h-8 p-0 w-16 mt-auto mb-auto"
                onClick={async (e) => {
                  if (
                    window.confirm(
                      `Are you sure you want to delete ${artwork.title}?`
                    )
                  ) {
                    deleteArtwork(e, artwork);
                    setArtworks(artworks.filter((a) => a.id !== artwork.id));
                  }
                }}
              >
                delete
              </button>
            </div>
          ))}
      </div>
    </>
  );
}
