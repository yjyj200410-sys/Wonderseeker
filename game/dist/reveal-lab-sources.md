# 神圣揭示预览 V2：来源与验证

预览：`http://127.0.0.1:4178/reveal-lab.html`

## 技术来源

- **直接复用**：Three.js 0.160.1 的 EffectComposer、UnrealBloomPass、OutputPass 及其依赖。保存在 `vendor/three/`，原 MIT LICENSE 同目录保留。来源：https://cdn.jsdelivr.net/npm/three@0.160.1/ 。
- **结构参考**：Codrops，Recreating the Exploding Particles Video Animation from M-trust.co.jp：https://tympanus.net/codrops/2020/11/09/recreating-the-exploding-particles-video-animation-from-m-trust-co-jp/ 。借鉴快速爆散、加法光粒子的组织。
- **结构参考**：Codrops，Crafting a Dreamy Particle Effect with Three.js and GPGPU：https://tympanus.net/codrops/2024/12/19/crafting-a-dreamy-particle-effect-with-three-js-and-gpgpu/ 。借鉴 GPU 点精灵、加法叠色、泛光的组合。本预览使用解析轨迹着色器，没有冒称实现了教程的 GPGPU 物理模拟。
- **结构参考**：Moonjump Portal Vortex：https://moonjump.com/forum/shader-sandbox/tutorial/portal-vortex 。借鉴极坐标旋流与向心收束。
- 神圣日冕、棱晶冠冕、极光双翼的具体着色器和揭示时间编排为本预览实现。未复制未授权商业 AE 工程或素材。

## 设计约束

1. 7 级：收束、凝聚、揭示，共三次点击。
2. EX：相同三段基础揭示后，第四次叠加专属形态。进入第四段保留 baseAge 与全局 time，物品不重新隐藏，7 级爆散不重新发射。
3. 先快后慢：收束半径与冲击波用指数 ease-out；物品快速落位后平稳停住；EX 使用四次 ease-out 展开。
4. 最终保留物品、品质色背景与持续缓慢运动的圣光。EX 增加轨道、棱晶或双翼。
5. 柔和模式冻结流动与短暂高亮，并立即显示展开状态。
6. 页面为独立参考预览，未修改正式游戏揭示逻辑。

## 文件

- reveal-lab.html：预览入口与参考链接。
- reveal-lab.css：预览界面与物品遮罩光效。
- reveal-lab.js：阶段、播放器、逐步点击和时间轴。
- reveal-lab-gpu.js：GPU 粒子、程序化光效与泛光。

## 验证记录（2026-10-17）

- 两个自有 JavaScript 模块通过 `node --check`。
- 浏览器实际渲染三套最终画面，无 WebGL 着色器编译错误及控制台错误。
- 检查 EX 在基础阶段与叠加阶段切换：物品透明度持续为 1。
- 检查完整播放、逐次推进、时间轴 End 定位、基础对比及柔和模式。
- 1440 像素桌面与 390 像素窄屏检查：页面无横向溢出，物品图片正常加载。
- 本机预览检查不代表已完成各类低端移动 GPU 性能测试。

## 日冕方案修订（2026-10-17）

用户选定日冕，以下约束替代前述第 2 项及其旧验证记录：

- EX 第三阶段为额外蓄力，物品、名称与轮廓辉光均隐藏。第四阶段才开始揭示物品。
- 背景提高基础亮度，降低暗角与蓄力阶段的压暗程度。
- 日冕 EX 的外部圣环、三重环与粒子环均使用正面圆形坐标，移除椭圆缩放和轨道倾角。
- 浏览器逐步验证：EX 第三阶段 reward opacity 为 0；第四阶段进入显现，最终正常展现。控制台无错误。

## 卡通配色与符文分层修订（2026-10-17）

- 背景改用更鲜明的高饱和彩虹色，减少中性金灰叠色，减弱暗角。
- 降低宽泛的泛光，保留清楚的光圈轮廓，避免背景再次被泛白。
- 日冕 EX 符文固定在半径 .64 的独立带，位于主日冕 .54 与最内层外环 .73 之间；不再与 .83/.86 外环重合。
- 浏览器检查最终 EX 画面，光圈与符文已错开，控制台无错误。

## 光团参考试作（2026-10-17）

预览光团对比提供原版及四个本地 shader 试作，未下载或嵌入原作素材，也不是原作动效的直接移植。正式游戏通过默认 coreStyle=0 保留原版。

- A 圣光珠核：Julien Delaunay, Holy Magic Spell VFX — https://juliendelaunay.artstation.com/projects/GaQXDz
- B 绘制云核：Shannon Grosenbacher, Wispy Magical Orb — https://www.artstation.com/artwork/DAVzKy
- C 临界电核：Inferno Studios, Capacitance — https://fueltheinferno.com/capacitance/
- D 分形光核：Ethan Menebroker, Magic Orb in Hand — https://emenebroker.artstation.com/projects/JlAPmv

每个选项进入第二阶段可持续观察，提供从头播放、下一阶段和最终定格。光团半径稳定，仅叠加亮度与轮廓细节；保留黑色蓄力底色，未恢复流动光带。
