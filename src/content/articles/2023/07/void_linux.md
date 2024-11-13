---
emoji: "🐧"
slug: "void_linux"
title: "Void Linuxをインストールする"
description: "Void Linuxのインストール及びi3デスクトップ環境の構築"
date: "2023-07-24"
tags: ["Tech", "Linux", "Void"]
published: true
---

![top:Void Linux with i3](/images/articles/void_linux/void_linux.jpeg)

## はじめに

Void Linux をメイン PC (Thinkpad E14 Gen 3) にインストールし、普段使いすることにした。なお、この記事は Linux をある程度使った経験がある人向けであり、初めて Linux に触れる人にはあまりおすすめできない。

## Void Linux って何？

あまりにも日本語の情報が少ない (下手するとこの記事で初めて知った人もいるかもしれない) ので英語の公式サイトを見てみる。

https://voidlinux.org

Void Linux は Linux ディストリビューション(以下、ディストロ)の一つである。以下のような特徴を持つ:

- 既存のディストロの派生ではなく、独立している
- ローリングリリース
- init システム (他の全てのプロセスを起動するプログラム) として systemd ではなく runit を用いる
- glibc と musl の二種類の C 言語ライブラリに対応している
- XBPS という独自に開発されたパッケージマネージャを使う
- [xbps-src](https://github.com/void-linux/void-packages) という Arch Linux における [AUR](https://wiki.archlinux.jp/index.php/Arch_User_Repository) のようなシステムがある (詳細はリンク先参照。Google Chrome はこれを使ってインストールする)

日本では知名度が低い (Wikipedia の記事さえ無い) が[Distrowatch の評価](https://distrowatch.com/dwres.php?resource=ratings&distro=void)は 9.3/10 とかなり高く、根強い人気があるようだ。

## インストールのきっかけ

私はこれまで、 Debian や Ubuntu Server などを普段使いしてきた。これらは自由度の高さと安定性を兼ね備える優れたディストロである一方、

- 安定性を重視しているためアプリやカーネルのバージョンが古くなる
- 定期的に OS 自体のバージョンをアップグレードする必要がある

という欠点があった。そこで、

- 比較的新しいバージョンのアプリが手に入る
- アプリやシステムの更新を連続的かつ頻繁に行うことで大規模なアップグレードをしなくてもよい（一般にローリングリリースと呼ばれる）

という 2 つの条件を満たすディストロを探すことにした。さらに、Debian が好きなので

- インストールや設定の方法が複雑すぎない
- 更新頻度が高すぎず、それなりに安定性がある
- 自由度が高い (デスクトップ環境無しでのインストールが可能)
- コミュニティの活動が活発 (急に開発が終わったら困る)

という条件も重視した。

これらを全て満たす都合の良いディストロが存在した。それが Void Linux である。

## インストール

https://voidlinux.org/download

xfce 環境でインストール出来る live image もあるが、デスクトップ環境を 1 から構築したいので base の方を選択する。

インストールの流れは下記に従えば問題ないと思われる。ちなみに、UEFI ではなく BIOS でブートする場合は EFI System Partition (/boot/efi にマウントするやつ) は必要ない。

http://note.kurodigi.com/voidlinux-uefi-install

## インストール後のセットアップ・設定など

ここからは、Void Linux の各機能の特徴や少し面倒そうな設定などを書き連ねていく。
公式ドキュメントが非常に丁寧なので、リンク先も参考にしてみて欲しい。

また、Void Linux に限らず Linux 関連のトラブルシューティングは [Reddit](https://www.reddit.com/) で検索してみると結構解決する。アカウントを作っておくと色々便利である。

### スクリプト

http://github.com/omemoji/dotfiles

インストールスクリプト付きの dotfiles を用意している。

```sh
git clone http://github.com/omemoji/dotfiles.git
cd dotfiles
make void-ja
```

でセットアップ出来る (実行は自己責任) 。フォークして自分好みにカスタマイズするといいと思う。
例えばインストールするアプリの一覧は`/pkg/xbps.txt`で管理しているので、そこをいじれば何を入れるか自由にカスタマイズすることが出来る。

ちなみに、この dotfiles は Debian と macOS にも対応している。

### runit

https://docs.voidlinux.org/config/services/index.html

他の多くのディストロではシステムやセッションの管理に systemd を用いるが、Void Linux では runit を用いる。

主な使い方を説明すると、例えば D-Bus を常に起動させたいなら

```sh
sudo ln -snfv /etc/sv/dbus /var/service/
```

という風にする。`/var/service`下にシンボリックリンクを作成することでサービスを有効化するようだ。また、有効化されているサービスについては

```sh
# sv up <services> //起動
# sv down <services> //停止
# sv restart <services> //再起動
# sv status <services> //状態を見る
```

といった操作も可能である。

`/var/service`下に手動でリンクを置いたサービスだけが runit によって監視・実行されるというのは面倒だが分かりやすく、シンプルである。systemd と比較したメリット・デメリット等については、init システムへの理解がまだあまり出来ていないのでよく分からない。そもそも、普段使いの際に systemd をいじった覚えがそこまでない (アプリのインストール時に自動で設定してくれていると思われる。まれに`systemctl status hoge` で様子を見たりしたくらい )。

### D-Bus & elogind (重要)

https://docs.voidlinux.org/config/session-management.html

これを設定し忘れると色々と支障が出る。両方ともすぐにインストールして、

```sh
sudo ln -snfv /etc/sv/dbus /var/service/
sudo ln -snfv /etc/sv/elogind /var/service/
```

で runit に起動させる。

### Xorg (デスクトップ環境)

https://docs.voidlinux.org/config/graphical-session/xorg.html

を読めば大抵解決する。i3 を使いたかったので、とりあえず

```sh
xorg i3 dmenu i3-lock xsslock xautolock polybar picom
```

をインストールした。`xorg-minimal`はドライバ等を自分で適切に選択しないと上手く機能しないので注意。

ディスプレイマネージャは使用せず、`startx`で起動する。その際、i3 であれば`~/.xinitrc`に

```sh
exec dbus-run-session i3
```

と記述しておく。`dbus-run-session`を書いておかないと Thunar (ファイルマネージャー) や fcitx5 が上手く動作しなかった。

> To provide a session bus, you can start a given program (usually a window manager or interactive shell) with dbus-run-session(1). Most desktop environments, if launched through an adequate display manager, will launch a D-Bus session themselves. \
> \- [https://docs.voidlinux.org/config/session-management.html#d-bus](https://docs.voidlinux.org/config/session-management.html#d-bus)

デスクトップ環境の起動時に D-Bus のセッションも同時に起動させるということらしい。

#### ディスプレイマネージャを使う場合

lightDM がおすすめ。

```
lighdm lightdm-gtk-greeter
```

をインストールした後、

```sh
sudo ln -snfv /etc/sv/lightdm /var/service/
```

で runit に起動させる。

### 日本語入力

fcitx5 を使う。

```sh
sudo xbps-install \
xprop \
fcitx5 \
fcitx5-mozc \
fcitx5-gtk \
fcitx5-gtk+2 \
fcitx5-gtk+3 \
fcitx5-qt \
fcitx5-configtool
```

### Sound

https://docs.voidlinux.org/config/media/pipewire.html

をよく読んで設定する。自分は上記の設定の後、`~/.xinitrc`に

```sh{}[.xinitrc]
pipewire &
pipewire-pulse &
```

と記述し、`startx`で i3 の起動と同時に立ち上がるようにした。多分`.Xprofile`に記述しても良い。

また、Bluetooth ヘッドホンを使いたい場合は上記に加え、

```
libspa-bluetooth bluez
```

をインストールする。その後、

```sh
sudo ln -snfv /etc/sv/bluetoothd /var/service/
```

で runit に起動させる。

## 感想

設定が思ったよりも大変だったが、公式ドキュメントの優秀さもあって今のところ不自由なく使用出来ている。ローリングリリースということで、今後はこれ一本で戦っていけそうである。また、同じく自由度が高いことで知られる Arch Linux と比較して更新がそれほど頻繁でなく安定性が高い点も、面倒臭がりの自分にとっては合っていると思う。

runit 周りの設定にかなり手こずってしまった。まだよく分かっていないところも多いが慣れれば便利そうなので、ドキュメントを更に読みつつ init システムへの理解を深めていきたい。

何かどうしようもない問題があったら Debian testing に戻す。

## 参考文献

- VoidLinux contributors."Enter The Void".Void Linux.July 21, 2023.[https://voidlinux.org/](https://voidlinux.org/), July 24, 2023
- VoidLinux contributors."About - Void Linux Handbook".Void Linux.July 21, 2023.[https://docs.voidlinux.org/](https://docs.voidlinux.org/), July 24, 2023
- クロ."Void Linux を UEFI + GPT 環境にインストールして最小環境を構築する".クロの思考ノート.August 13, 2022.[http://note.kurodigi.com/voidlinux-uefi-install/](http://note.kurodigi.com/voidlinux-uefi-install/), 2023/7/24
