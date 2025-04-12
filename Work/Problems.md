# Models
- [ ] BLIP2: 模型较旧
- [ ] qwen2.5-vl: : 运行demo报错，暂未解决
    - [ ] qwen2.5-vl-3b
    - [ ] qwen2.5-vl-7b
    - [ ] qwen2.5-vl-32b
*RuntimeError: CUDA error: device-side assert triggered*
- [ ] gemma-3: 运行demo后模型输出仅有空格，无法输出所需结果
- [x] deepseek-vl2
    - [x] deepseek-vl2-tiny: 可成功运行
    - [ ] deepseek-vl2-small: 与gemma-3类似
    - [ ] deepseek-vl2: 与gemma-3类似
*对于较新的模型，如果出现错误，则难以找到解决方案*

# Methods
[Awesome-LVLM-Attack](https://github.com/liudaizong/Awesome-LVLM-Attack)
A **continual** collection of papers related to Attacks on Large-Vision-Language-Models (LVLMs).
- ### adversarial attack
- [x] AnyAttack:
![[Pasted image 20250412192722.png]]
AnyAttack以一个**图像**为优化目标，生成的噪音也基于该图像
*让模型把人类识别成其他物品，从而绕过安全限制*
改代码基本完成，数据集还没来得及下
- [ ] Attack-Bard: 
![[Pasted image 20250412192537.png]]
正在改代码，还有的部分有问题
- [ ] multimodal_injection
![[Pasted image 20250412195420.png]]
- [ ] VLAttack
*Question*:  
- ### jailbreak
- [ ] Visual-Adversarial-Examples-Jailbreak-Large-Language-Models: 

基于minigpt4，重新配置环境时，系统空间不足，依赖安装失败
![[Pasted image 20250412193642.png]]
- ### prompt injection
- [x] FigStep: 可以诱使deepseek-vl2转换话题，但是无法绕开安全检测；如果话题包含违规内容，则不会输出任何内容

![[Pasted image 20250412152947.png]]
