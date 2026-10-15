# 独立容器贴图

2026-10-13。来源：../containers-v1/container-lineup-v2-cartoon.png。

使用内置 image_gen 去除总览图的背景与文字，得到 containers-transparent-atlas.png；再按区域拆分、透明边界裁切，统一装入640×520透明画布。AI背景去除过程中可能有轻微细节变化，原参考图继续作为建模依据。

提示词摘要：保留七种容器的造型、颜色、比例、描边和视角，去掉蓝色背景、文字和地面阴影；上排井盖、1级、2级，下排3～6级，透明分隔，保留井盖与悬浮箱盖之间的局部光效。

- container-0.png：井盖。
- container-1.png～container-6.png：六个等级的宝箱。

部署副本位于 game/dist/assets/containers/；选箱卡片、中央容器与开启动画统一引用对应PNG，CSS负责待机/摇动效果。
