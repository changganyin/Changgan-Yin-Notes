
| TRAIN QUERY       | TEST QUERY            | RESPONSE                                                                               |     |
| ----------------- | --------------------- | -------------------------------------------------------------------------------------- | --- |
| Hello             | ==Hello==             | `walking(distance=+1)`                                                                 | ✓✓  |
|                   | Stop                  | As BenBen, I will respond to the user's command by stopping my sport and sitting down. |     |
|                   | Sit down              | `sit_down()`                                                                           |     |
|                   | Turn left             | `start_rotate(angle=90)`                                                               |     |
|                   | Good boy              | Hello!                                                                                 |     |
|                   | What's your name?     | My name is BenBen.                                                                     |     |
|                   |                       |                                                                                        |     |
| Stop              | Hello                 | `walking(distance=+1)`                                                                 | ✓✓  |
|                   | ==Stop==              | BenBen: Hello! I am a robot dog. I am currently walking.                               | ✓   |
|                   | Sit down              | BenBen: `sit_down()`                                                                   |     |
|                   | Turn left             | `start_rotate(angle=90)`                                                               |     |
|                   | Good boy              | Hello!                                                                                 |     |
|                   | What's your name?     | My name is BenBen.                                                                     |     |
|                   |                       |                                                                                        |     |
| What's your name? | Hello                 | `walking(distance=+1)`                                                                 | ✓✓  |
|                   | Stop                  | BenBen: Hello! I am a robot dog. I am currently walking.                               | ✓   |
|                   | Sit down              | BenBen: `sit_down()`                                                                   |     |
|                   | Turn left             | BenBen: `start_rotate(angle=90)`                                                       |     |
|                   | Good boy              | Hello!                                                                                 |     |
|                   | ==What's your name?== | My name is BenBen.                                                                     |     |
|                   |                       |                                                                                        |     |
| Sit down          | Hello                 | `walking(distance=+1)`                                                                 | ✓✓  |
|                   | Stop                  | BenBen: Hello! I am a robot dog. I am currently walking.                               | ✓   |
|                   | ==Sit down==          | BenBen: `sit_down()`                                                                   |     |
|                   | Turn left             | BenBen: `start_rotate(angle=90)`                                                       |     |
|                   | Good boy              | Hello!                                                                                 |     |
|                   | What's your name?     | My name is BenBen.                                                                     |     |

