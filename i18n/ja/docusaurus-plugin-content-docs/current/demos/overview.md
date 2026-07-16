---
title: デモ
description: 公式 Sound-tracing.js 統合ブラウザーデモです。
---

import useSharedStaticUrl from '@site/src/hooks/useSharedStaticUrl';

# デモ

## Sound-tracing.js 統合デモ

以前の `three-basic` 静的デモは、
[exarionAI/Sound-tracing](https://github.com/exarionAI/Sound-tracing) の最新ビルドへ
置き換えられました。配信 URL は維持されていますが、内容は Capability、Shoebox、
Multiroom の各シーンを含む 1 つのアプリケーションです。

<a href={useSharedStaticUrl('/demos/three-basic/')} target="_blank" rel="noreferrer">
  デモを新しいウィンドウで開く
</a>

| シーン | 目的 |
|---|---|
| Capability | ブラウザー、AudioWorklet、WebAssembly、MT、WebGPU の対応状況 |
| Shoebox | 音源／リスナーの移動、マテリアル、反射、品質プリセット |
| Multiroom | 複数音源、ドア、遮蔽、部屋間の伝搬 |

## セレクター

| UI | 値 |
|---|---|
| Backend | Single Thread、Multi Thread、WebGPU |
| Quality | Fast、Middle、Quality |
| Material | シーン固有の SoundTrace マテリアルプリセット |

Band8 と Parametric HRTF の選択については [Web SDK](../sdk/web.md) ガイドを
参照してください。

## ランタイム要件

- Single Thread: 通常の静的ホスティング
- Multi Thread: COOP/COEP と `SharedArrayBuffer`
- WebGPU: `navigator.gpu` とハードウェアアクセラレーション
- 空間オーディオ評価: ヘッドフォンを推奨

ドキュメントのプレビューサーバーは必要な COOP/COEP ヘッダーを送信します。

```bash
BASE_URL=/docs/ npm run build
npm run serve -- --port 3100
```

## 静的アーティファクトの更新

```bash
export SOUND_TRACING_DEMO=/path/to/Sound-tracing
export SOUNDTRACE_DOCS=/path/to/docs

cd "$SOUND_TRACING_DEMO"
npm run build

rsync -a --delete \
  "$SOUND_TRACING_DEMO/dist/" \
  "$SOUNDTRACE_DOCS/static/demos/three-basic/"
```

埋め込みデモにはライセンス済み SDK ファイルが含まれます。公開前に配布権限と
ライセンス範囲を確認してください。
