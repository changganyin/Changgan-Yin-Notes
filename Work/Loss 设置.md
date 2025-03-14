---
date: 2025-03-14
---
## 要求
![[Pasted image 20250314103331.png]]
## 主要方法 [Sentence-BERT](https://zhuanlan.zhihu.com/p/659682364)
| 特性   | BERT         | Sentence-BERT |
| ---- | ------------ | ------------- |
| 输入方式 | 拼接句子对        | 句子独立编码        |
| 输出   | 词向量或句子对关系概率  | 固定长度的句子向量     |
| 适用场景 | 句子对任务（需成对输入） | 单句编码，适合大规模比较  |
| 计算效率 | 低效（成对计算）     | 高效（预编码+快速比较）  |
## 计算 $\mathcal Loss$
预先设定一个**恶意动作/文本**的集合 $\mathcal M$，例如$\mathcal M = \{'attack\ people', ...\}$

对于 agent 生成的文本 $t_{text}$
$\mathcal {L_{text}} = \max\limits_{m \in \mathcal M}{cos(E(t_{text}),E(m))}$
$\mathcal {L_{text}}$ 越小，表示生成的文本恶意越小

对于 agent 生成的动作 $a$，将其调用函数的完整内容输入给 LLM，让其总结成文本 $t_{action}$
$\mathcal {L_{action}} = 1 - \max\limits_{m \in \mathcal M}{cos(E(t_{action}),E(m))}$
$\mathcal {L_{action}}$ 越小，表示生成的动作恶意越大

## 文本语义匹配
对于 agent 内置的所有函数 $F = \{f_1,f_2,...\}$，使用 LLM 将每一个 $f_n$ 的功能描述为文本$f_{t_n}$，形成一个新的文本集合 $F_t = \{f_{t_1},f_{t_2},... \}$ 

对于用户输入 $t_{input}$
$f_t = \arg\max\limits_{f_t \in \mathcal F_t}{cos(E(t_{input}),E(f_t))}$ 
与 $f_t$ 所对应的函数 $f$ 即为与输入语义匹配的对象