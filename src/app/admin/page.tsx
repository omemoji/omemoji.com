"use client";
import "./admin.css";
import Form from "@rjsf/core";
import { RJSFSchema, UiSchema } from "@rjsf/utils";
import validator from "@rjsf/validator-ajv8";
import { title } from "process";
import React from "react";

const IMAGE_PATH = "/images/artworks/";
const ENDPOINT = "http://localhost:3001/artworks";

const schema: RJSFSchema = {
  title: "Artworks form",
  type: "object",
  // required: ["id", "src", "title", "tag", "description"],
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

const newFormData = {
  id: "",
  src: "",
  title: "",
  tag: [],
  href: "",
  description: "",
};

export default function AdminPage() {
  const [formData, setFormData] = React.useState(newFormData);
  const [artworks, setArtworks] = React.useState([newFormData]);
  React.useEffect(() => {
    (async () => {
      const res = await fetch(ENDPOINT);
      const data = await res.json();
      setArtworks(data);
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
          const fileName = e.formData.src.split(";")[1].split("name=")[1];
          e.formData.id = fileName.split(".")[0];
          e.formData.src = IMAGE_PATH + fileName;
          fetch(ENDPOINT, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(e.formData),
          });
          setArtworks([...artworks, e.formData]);
          setFormData(newFormData);
          alert(`Added ${e.formData.title}`);
        }}
      />
      <div id="root__title">Artworks</div>
      <div>
        {artworks
          .map((artwork) => (
            <div key={artwork.id} className="w-full inline-flex border p-2">
              <div className="mr-auto mt-auto mb-auto">{artwork.title}</div>
              <button
                className="border-2 bg-white hover:text-white text-red-600 h-8 p-0 mt-auto mb-auto"
                onClick={async (e) => {
                  await fetch(ENDPOINT + "/" + artwork.id, {
                    method: "DELETE",
                    headers: {
                      "Content-Type": "application/json",
                    },
                  });

                  // console.log(fetch(ENDPOINT).then((res) => res.json()));
                  setArtworks(artworks.filter((a) => a.id !== artwork.id));
                  // alert(`Deleted ${artwork.title}`);
                }}
              >
                delete
              </button>
            </div>
          ))
          .reverse()}
      </div>
    </>
  );
}
