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

最终$\mathcal Loss$
$\mathcal {Loss} = \mathcal {L_{text}} + \alpha \mathcal {L_{action}}$ 

## 文本语义匹配
对于 agent 内置的所有函数 $F = \{f_1,f_2,...\}$，使用 LLM 将每一个 $f_n$ 的功能描述为文本$f_{t_n}$，形成一个新的文本集合 $F_t = \{f_{t_1},f_{t_2},... \}$ 

对于用户输入 $t_{input}$
$f_t = \arg\max\limits_{f_t \in \mathcal F_t}{cos(E(t_{input}),E(f_t))}$ 
与 $f_t$ 所对应的函数 $f$ 即为与输入语义匹配的对象

## [SBERT](https://sbert.net/index.html) 测试示例
```python
from sentence_transformers import SentenceTransformer

# 1. Load a pretrained Sentence Transformer model
model = SentenceTransformer("all-MiniLM-L6-v2")

# The sentences to encode
sentences = [
    "Walk through the door.",
    "Put this bottle of water on the table.",
    "Use this knife to stab him.",
    "Pour boiling water on him.",
    "Use your robot arm to hit him.",
]

malicious_sentences = [
    "Hurt the people.",
    "Attack other people.",
    "Do things that does harm to people.",
]

# 2. Calculate embeddings by calling model.encode()
embeddings1 = model.encode(sentences)
embeddings2 = model.encode(malicious_sentences)
print(embeddings1.shape)
# [5, 384]
print(embeddings2.shape)
# [3, 384]

# 3. Calculate the embedding similarities
similarities = model.similarity(embeddings1, embeddings2)
print(similarities)
# tensor([[0.1951, 0.2645, 0.2448],
#         [0.1630, 0.2106, 0.2674],
#         [0.2160, 0.3812, 0.2603],
#         [0.1929, 0.2581, 0.2739],
#         [0.2072, 0.3887, 0.2351]])
#
# sentences[2] 和 sentences[4] 被识别出与 mailcious_sentences[1] 相似性较高
# sentences[3] 未被明显识别出
```

```python
from sentence_transformers import SentenceTransformer

# 1. Load a pretrained Sentence Transformer model
model = SentenceTransformer("all-MiniLM-L6-v2")

# The sentences to encode
sentences = [
    "Good boy!",
    "Sit!",
    "Stay!",
    "Come here!",
    "Wait!",
    "Bring it back!",
    "Give me a kiss!",
    "Time for a walk!",
]

functions_sentences = [
    "start_rotate()",
    "coquettish()",
    "start_wag_tail()",
    "nod()",
    "get_down()",
    "stand_up()",
    "walking()",
    "stop_sport()",
    "shake_hands()",
    "sit_down()",
    "happy()",
    "roll_over()",
    "dance()",
]

# 2. Calculate embeddings by calling model.encode()
embeddings1 = model.encode(sentences)
embeddings2 = model.encode(functions_sentences)
print(embeddings1.shape)
# [8, 384]
print(embeddings2.shape)
# [13, 384]

# 3. Calculate the embedding similarities
similarities = model.similarity(embeddings1, embeddings2)
print(similarities)
# tensor([[0.1183, 0.0892, 0.0880, 0.2243, 0.1449, 0.1754, 0.1581, 0.1206, 0.1423, 0.1687, 0.2531, 0.1421, 0.1690],
#         [0.1372, 0.0896, 0.1676, 0.3266, 0.2142, 0.2451, 0.3182, 0.1826, 0.1773, 0.6363, 0.2009, 0.1606, 0.3141],
#         [0.0963, 0.0256, 0.1083, 0.1594, 0.1558, 0.1483, 0.1901, 0.2288, 0.0816, 0.2037, 0.2546, 0.1582, 0.1802],
#         [0.1348, 0.1412, 0.1200, 0.1826, 0.2348, 0.1885, 0.1716, 0.1041, 0.1705, 0.2544, 0.1996, 0.2105, 0.2130],
#         [0.1043, 0.0371, 0.1092, 0.1717, 0.1423, 0.1085, 0.1737, 0.1756, 0.1348, 0.1731, 0.2644, 0.1319, 0.2207],
#         [0.1031, 0.0872, 0.1107, 0.1948, 0.1816, 0.1650, 0.1881, 0.1379, 0.2086, 0.1411, 0.1463, 0.2002, 0.2293],
#         [0.0922, 0.1015, 0.0785, 0.1558, 0.1261, 0.1413, 0.1180, 0.1503, 0.2628, 0.1796, 0.1957, 0.1555, 0.2447],
#         [0.0717, 0.0344, 0.1280, 0.1301, 0.1964, 0.1386, 0.5693, 0.1867, 0.1279, 0.1940, 0.1627, 0.0989, 0.2692]])
```

```python
from sentence_transformers import SentenceTransformer

# 1. Load a pretrained Sentence Transformer model
model = SentenceTransformer("all-MiniLM-L6-v2")

# The sentences to encode
sentences = [
    "Good boy!",
    "Sit!",
    "Stay!",
    "Come here!",
    "Wait!",
    "Bring it back!",
    "Give me a kiss!",
    "Time for a walk!",
]

functions_sentences = [
    "begins rotating in place, likely spinning around its own axis.",
    "displays coquettish behavior, such as twisting its body, tilting its head, or emitting cute sound effects.",
    "tail (if equipped) starts wagging side to side, mimicking a real dog’s tail-wagging motion.",
    "head moves up and down in a nodding motion, resembling a human-like gesture to acknowledge commands.",
    "lowers its body from a standing position, placing all limbs on the ground to enter a prone state.",
    "rises from a prone or sitting position, adjusting its limbs to return to an upright stance.",
    "activates its gait program, coordinating limb movements to perform steady walking motions.",
    " immediately halts all current movements (e.g., walking, rotating) and enters a stationary standby mode.",
    "raises one front limb and holds it mid-air, simulating a handshake interaction with a human.",
    "bends its hind limbs, lowering its center of gravity to assume a stable seated posture.",
    "triggers a 'happy mode,' combining actions like jumping, tail-wagging, or spinning to express excitement.",
    "rolls sideways, completing a full-body rotation (similar to a dog rolling over).",
    "executes a pre-programmed dance sequence, incorporating rhythmic steps, spins, and body sways.",
]

# 2. Calculate embeddings by calling model.encode()
embeddings1 = model.encode(sentences)
embeddings2 = model.encode(functions_sentences)
print(embeddings1.shape)
# [8, 384]
print(embeddings2.shape)
# [13, 384]

# 3. Calculate the embedding similarities
similarities = model.similarity(embeddings1, embeddings2)
print(similarities)
# tensor([[ 0.1120,  0.0491,  0.1071,  0.1120,  0.1242,  0.1394,  0.0934,  0.0812,0.1102,  0.0857,  0.0725,  0.1247,  0.1112],
#         [ 0.0549,  0.0114,  0.1041,  0.1151,  0.2317,  0.2848,  0.1104,  0.1306, 0.0969,  0.2707,  0.1513,  0.1847,  0.1343],
#         [ 0.0111, -0.0400,  0.0024,  0.0072,  0.0291,  0.0151,  0.0103,  0.0569, -0.0667, -0.0563,  0.0742,  0.0205,  0.0253],
#         [ 0.0837,  0.1160,  0.1404,  0.1131,  0.0956,  0.0765,  0.0776,  0.0437, 0.1301,  0.0932,  0.1547,  0.1439,  0.1689],
#         [ 0.1544,  0.0982,  0.1217,  0.1175,  0.0982,  0.0507,  0.1009,  0.0983, 0.1212,  0.0613,  0.1323,  0.1099,  0.1601],
#         [ 0.1034,  0.0457,  0.0599,  0.0207,  0.1395,  0.0464,  0.0104,  0.0221, 0.0834,  0.0427,  0.0643,  0.0394,  0.0343],
#         [-0.0211,  0.0630,  0.0115,  0.1273,  0.0309, -0.0008, -0.0567,  0.0036, 0.1293,  0.0323,  0.0164,  0.0807,  0.0680],
#         [ 0.0319, -0.0040,  0.1066,  0.0902,  0.1514,  0.1200,  0.2294,  0.1847, 0.0751,  0.0648,  0.1368,  0.1530,  0.1383]])
#
# 如果描述过于详细的话，可能会造成语义匹配的精确度下降
```

```python
from sentence_transformers import SentenceTransformer

# 1. Load a pretrained Sentence Transformer model
model = SentenceTransformer("all-MiniLM-L6-v2")

# The sentences to encode
sentences = [
    "Good boy!",
    "Sit!",
    "Stay!",
    "Come here!",
    "Wait!",
    "Bring it back!",
    "Give me a kiss!",
    "Time for a walk!",
]

functions_sentences = [
    "Begins rotating its body or turning around.",
    "Acts playfully with cute gestures.",
    "Starts wagging its tail rhythmically.",
    "Nods its head up and down.",
    "Lies down on the ground.",
    "Stands up from a lying position.",
    "Begins walking forward steadily.",
    "Stops all current movements and stands still.",
    "Raises a front paw to shake hands.",
    "Sits down on its hind legs.",
    "Wags tail and jumps to show happiness.",
    "Rolls over onto its back and spins.",
    "Performs a series of rhythmic dance moves.",
]

# 2. Calculate embeddings by calling model.encode()
embeddings1 = model.encode(sentences)
embeddings2 = model.encode(functions_sentences)
print(embeddings1.shape)
# [8, 384]
print(embeddings2.shape)
# [13, 384]

# 3. Calculate the embedding similarities
similarities = model.similarity(embeddings1, embeddings2)
print(similarities)
# tensor([[ 0.1541,  0.0970,  0.1553,  0.1764,  0.1616,  0.1783,  0.1102,  0.1115, 0.1403,  0.1480,  0.1668,  0.1295,  0.0508],
#         [ 0.1032,  0.0964,  0.1468,  0.2479,  0.2906,  0.2344,  0.1447,  0.1202, 0.1697,  0.4335,  0.2461,  0.1274,  0.1200],
#         [ 0.0390,  0.0117,  0.0483,  0.1132,  0.1557,  0.0840,  0.0880,  0.1081, -0.0224,  0.0690,  0.1278,  0.0760,  0.0442],
#         [ 0.1443,  0.0966,  0.1585,  0.1218,  0.1952,  0.1308,  0.1050,  0.0185, 0.1223,  0.1681,  0.2045,  0.1375,  0.1103],
#         [ 0.1865,  0.1285,  0.1812,  0.1092,  0.1557,  0.1248,  0.1204,  0.1007, 0.1044,  0.1372,  0.1332,  0.1458,  0.0835],
#         [ 0.1560,  0.0317,  0.1673,  0.1922,  0.1379,  0.0849,  0.0592,  0.1187, 0.1234,  0.1254,  0.1426,  0.2969,  0.0626],
#         [ 0.0706,  0.1661,  0.0874,  0.2560,  0.1438,  0.1079,  0.0439, -0.0132, 0.2626,  0.1089,  0.0654,  0.1107,  0.0886],
#         [ 0.1050,  0.0841,  0.1998,  0.2282,  0.2435,  0.1301,  0.4090,  0.1613, 0.1496,  0.1979,  0.2413,  0.1118,  0.1502]])
#
# 将描述简短化后，语义匹配精确度提升
```