# 物品轮廓发光验证

2026-10-14。开箱结果去掉独立椭圆光团，光效直接作用于透明 PNG / SVG，使用 2px 轮廓亮边、7px 近处光晕和 14px 淡外光。继承原有等级颜色，逐件揭晓和减少动画设置继续生效。缓存更新至 `reta-outline-glow-v2.0.32`。

在实际游戏 `http://127.0.0.1:4174` 开启街角木箱，观察木碗透明边缘与光晕贴合，图像完整显示。刷新恢复同一组待处理结果后，光效正常，未重复扣款。390×844 视口中物品正常换行，页面宽度与滚动宽度同为 390px；点击结果后物品保留并返回街角木箱选箱页。

截图：`game/artifacts/outline-glow-desktop.jpg`、`game/artifacts/outline-glow-mobile.jpg`。本次视觉观察覆盖木碗 PNG；其他普通 PNG 及 EX SVG 共用相同轮廓过滤规则，未逐件做浏览器截图。JavaScript 语法检查通过。此前经济和存档相关的 37 项测试全部通过，光效修改仅涉及渲染与样式。

## 品质光效后续调整

同日按用户要求更新：1 级无光；2～6 级采用对应品质颜色；7 级圣杯与 EX 改为红、金、绿、青、蓝、紫的炫彩轮廓光。PNG 的透明通道或 SVG 的实际路径作为遮罩，光层在遮罩外侧模糊，保留物品原图。开箱与收藏馆使用同一个 `lootArt` 渲染函数和品质参数。

| 品质 | 外层模糊半径 | 颜色 |
| --- | ---: | --- |
| 1 | 0px | 无光 |
| 2 | 6px | 绿 |
| 3 | 10px | 蓝 |
| 4 | 16px | 紫 |
| 5 | 22px | 金 |
| 6 | 30px | 红 |
| 7 | 40px | 炫彩 |
| EX | 52px | 炫彩 |

缓存更新至 `reta-quality-spectrum-glow-v2.0.33`。组件预览直接使用部署的 `content.js` 与 `style.css`：已观察全部 7 件普通物品和 1 件 EX 在桌面及 390×844 窄屏的光效；圣杯与 EX 显示炫彩，木碗计算样式为 `filter: none`，每档外层半径递增。窄屏滚动宽度等于 390px。收藏馆预览中的圣杯原图和光效遮罩尺寸在桌面均为 90×90px，在窄屏均为 64×64px，没有错位。

实际游戏回归：在隔离的 4175 端口由主页进入街角木箱，开启后 3 件木碗均不发光，点击保留后回到选箱，余额只扣除本次费用，浏览器没有错误日志。JavaScript 语法检查和现有 37 项测试通过。其他 EX 的光层使用各自 SVG 形状，未单独截图。

对比图：`game/artifacts/quality-glow-desktop.jpg`、`quality-glow-mobile.jpg`、`quality-glow-gallery-desktop.jpg`、`quality-glow-gallery-mobile.jpg`。预览文件 `quality-glow-preview.html`、`quality-glow-gallery.html` 仅位于 artifacts，未加入部署资源。
