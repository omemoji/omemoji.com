# CMS の追加（将来の拡張）

[`02-no-framework-ssg.md`](./02-no-framework-ssg.md) の構成を前提に、作品の投稿を GUI から行えるようにする場合の設計。

**現時点では実装しない。** 移行完了後、必要になった段階で参照するための記録。

## 0. 前提の切り分け

### 何が面倒なのか

移行後の構成で作品を 1 件追加する手順は次の 4 つ。

1. ディレクトリを作る
2. 画像を置く
3. `meta.json` を書く
4. コミットして push

ターミナルの前にいれば 1 分の作業であり、CMS が解決する余地は小さい。実際の痛点は 2 つに限られる。

- **スマホ・タブレットから追加できない**
- **タグの綴りを覚えていない**

この 2 つは別々の手段で解ける。両方に CMS を持ち出す必要はない。

### 対象は作品のみ

記事に CMS は使わない。長い技術記事をブラウザのテキストエリアで書くのは、エディタで書くより明確に劣る。記事は従来どおり Markdown ファイルを直接編集する。

### 満たすべき不変条件

**CMS はファイルを書くだけで、ビルド側は CMS の存在を知らない。**

CLI で作っても CMS で作っても、生成される `meta.json` は同一である。したがって CMS は **いつでも足せて、いつでも外せる**付属物になる。ビルドが CMS に依存しないというこの性質を壊さないことが、以下すべての設計の前提になる。

---

## 1. 段階 A: CLI スクリプト（まずこれ）

```sh
bun run scripts/new-artwork.ts
```

対話プロンプトで title / tags / 画像パスを受け取り、以下を実行する。

1. `src/content/artworks/<slug>/` を作成
2. 画像をコピー
3. `meta.json` を生成（`$schema` キーを含む）
4. zod で検証

**50 行程度、追加インフラはゼロ。**

タグの選択肢は zod の `z.enum` から生成するため、**綴りの問題はこの段階で解消する**。痛点の片方が消える。

残るのは「スマホから追加できない」のみ。それが実際に必要になるかを見極めてから次へ進む。

---

## 2. 段階 B: Git ベース CMS（Sveltia CMS）

スマホからの投稿が必要になった場合の解。**サーバもデータベースも不要**で、ブラウザから GitHub へ直接コミットする方式。

Sveltia CMS は Decap CMS（旧 Netlify CMS）の後継にあたる実装で、ビルド不要の静的ファイルとして動く。保守が滞る場合の退避先として Decap CMS も同じ設定思想を持つ。

### 構成

```
[ブラウザ] → /admin （静的 HTML + sveltia-cms.js）
                ↓ GitHub OAuth
           [Cloudflare Worker] （client secret を保持するだけ）
                ↓
           GitHub API → main に commit
                ↓ push
           GitHub Actions → bun run build → Cloudflare Pages
```

### 追加物

| 追加物                    | 内容                                             |
| ------------------------- | ------------------------------------------------ |
| `public/admin/index.html` | CMS を読み込むだけの静的ページ                   |
| `public/admin/config.yml` | コレクション定義（zod から生成する。§3 ②）       |
| Cloudflare Worker 1 つ    | OAuth の中継。既製の `sveltia-cms-auth` が使える |

### 作品コレクションの定義

[`02-no-framework-ssg.md`](./02-no-framework-ssg.md) §4 で決めたディレクトリ構造に素直に対応する。

```yaml
collections:
  - name: artworks
    folder: src/content/artworks
    path: "{{slug}}/meta" # <slug>/meta.json になる
    extension: json
    format: json
    media_folder: "" # 画像をエントリと同じディレクトリに置く
    public_folder: ""
    create: true
    fields:
      - { name: title, widget: string }
      - { name: date, widget: datetime, date_format: YYYY-MM-DD, time_format: false }
      - { name: tags, widget: select, multiple: true, options: [Illustration, Krita, ...] }
      - { name: image, widget: image }
      - { name: href, widget: string, required: false }
      - { name: description, widget: text, required: false }
```

- `path` によるサブディレクトリ化と `media_folder: ""` による画像併置が、**「1 作品 1 ディレクトリ」の構造にそのまま噛み合う**
- `tags` の `widget: select` が、タグを `z.enum` で制約する判断と一致する

---

## 3. 実装時に詰まる点

### ① `$schema` キーが書かれない

CMS は定義したフィールドしか出力しないため、`"$schema": "../_schema.json"` が落ちる。

`widget: hidden` + `default` で補うのが定石だが、`$` で始まるフィールド名が通るかは要検証。通らない場合は、**ローダ側で `$schema` を無視する**（zod スキーマで明示的に optional として受ける）方が確実。

### ② タグ enum の二重管理

zod の `z.enum` と `config.yml` の `options` に同じリストが並ぶ。

**`config.yml` は zod から生成すること。** `_schema.json` の生成（§4 ③）と同じ仕組みに乗るため追加コストはわずか。ここを手で二重管理すると、単一定義元という設計が壊れる。

### ③ プレビュー機能は無効化する

Decap 系のプレビューペインはブラウザ内でレンダリングするため、ビルド時の unified パイプライン（remark / rehype / expressive-code）を再現できない。`editor: { preview: false }` として諦める。

### ④ `/admin` を検索避けする

サイトマップから除外し、`noindex` を付ける。サイトマップの収録ルールに 1 行足す形になる。

### ⑤ フォーマットの揺れ

CMS が書く JSON の整形が Biome の設定と食い違う可能性がある。CI で `biome format` を通すか、差分を受け入れるかを事前に決めておく。

### ⑥ 直接コミットか PR か

`publish_mode: editorial_workflow` にすると PR が作られる。既存の `deploy.yml` は Dependabot の PR にのみプレビューを出す作りのため、CMS の PR もプレビュー対象にするなら条件式の調整が要る。

---

## 4. 却下した案

| 案                                                   | 理由                                                                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **自前の管理画面**（Cloudflare Worker + GitHub API） | 認証・UI・検証をすべて自作することになる。段階 B で足りるなら選ぶ理由がない                                         |
| **D1 + 実行時レンダリング**                          | SSG を放棄することになる。[`02-no-framework-ssg.md`](./02-no-framework-ssg.md) §4 の「DB は入れない」判断と矛盾する |

---

## 5. 段取り

1. **移行を完了させる**（作品を `meta.json` 化する）
2. **段階 A の CLI スクリプトを作る** — タグの綴り問題がここで解決する
3. **スマホから投稿したい場面が実際に発生したら段階 B を足す**

順序が重要である。**先に §4 の構造（1 作品 1 ディレクトリ + enum 化されたタグ）を確定させておけば、段階 B の設定はほぼ機械的に決まる。**

逆に、現在の単一 `db.json` のままでは Git ベース CMS はうまく載らない。1 ファイルを複数セッションから編集する形になり、この方式の想定から外れるため。**CMS を将来入れる可能性があること自体が、§4 の「1 件 1 ファイル」という判断を補強している。**
