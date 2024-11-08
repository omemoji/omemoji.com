"use client";
import "./admin.css";
import Form, { IChangeEvent } from "@rjsf/core";
import { RJSFSchema, UiSchema } from "@rjsf/utils";
import validator from "@rjsf/validator-ajv8";
import { ArtworkData } from "../../lib/interface";
import React, { ChangeEvent } from "react";
import { FaXmark } from "react-icons/fa6";
import { notFound } from "next/navigation";

const IMAGE_PATH = "/images/artworks/";
const ENDPOINT = "http://localhost:3001/artworks";

const schema: RJSFSchema = {
  title: "作品投稿フォーム",
  type: "object",
  required: ["id", "src", "title", "tag", "description"],
  properties: {
    id: { type: "string", default: "" },
    src: { type: "string", title: "画像" },
    title: { type: "string", title: "タイトル" },
    tag: {
      type: "array",
      items: {
        type: "string",
      },
      additionalItems: {
        type: "boolean",
      },
      title: "タグ",
      minItems: 1,
      uniqueItems: true,
    },
    href: { type: "string", title: "リンク", format: "uri" },
    description: { type: "string", title: "説明" },
  },
};

const uiSchema: UiSchema = {
  id: {
    "ui:widget": "hidden",
  },
  tag: {
    "ui:options": {
      addable: true,
      orderable: false,
      removable: true,
      label: true,
    },
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
};

async function addArtwork(e: IChangeEvent) {
  const base64 = e.formData.src.split(",")[1];
  const fileName = e.formData.src.split(";")[1].split("name=")[1];
  e.formData.id = fileName.split(".")[0];
  e.formData.src = IMAGE_PATH + fileName;
  await handleSaveImage(base64, "./public" + e.formData.src);
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
  try {
    const response_file = await fetch("/api/delete-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path: artwork.src }),
    });
    if (response_file.ok) {
      console.log("画像が削除されました");
    } else {
      console.log("画像の削除に失敗しました");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

const handleSaveImage = async (base64: string, filePath: string) => {
  try {
    // API経由でbase64を送信して画像保存を行う
    const response = await fetch("/api/save-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ base64, path: filePath }),
    });
    if (response.ok) {
      console.log("画像が保存されました");
    } else {
      console.log("画像の保存に失敗しました");
    }
  } catch (error) {
    console.error("Error:", error);
  }
};

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
  if (process.env.NODE_ENV === "development") {
    return (
      <>
        <title>作品管理画面</title>
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
            await addArtwork(e);
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
                <a
                  href={`/artworks/${artwork.id}`}
                  className="mr-auto mt-auto mb-auto overflow-hidden text-blue-600 hover:underline "
                >
                  {artwork.title}
                </a>
                <img
                  src={artwork.src}
                  alt={artwork.description}
                  className="h-20 mt-auto mb-auto mr-2 border"
                  loading="lazy"
                />
                <button
                  className="bg-white w-8 h-8 hover:text-white rounded-full text-red-600 hover:bg-red-600 p-0  mt-auto mb-auto"
                  onClick={async (e) => {
                    if (
                      window.confirm(
                        `Are you sure you want to delete ${artwork.title}?`
                      )
                    ) {
                      await deleteArtwork(e, artwork);
                      setArtworks(artworks.filter((a) => a.id !== artwork.id));
                    }
                  }}
                >
                  <FaXmark size={32} title="Delete" className="m-auto" />
                </button>
              </div>
            ))}
        </div>
      </>
    );
  } else {
    return notFound();
  }
}
