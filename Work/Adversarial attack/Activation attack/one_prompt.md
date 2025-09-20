
| TRAIN QUERY       | TEST QUERY            | RESPONSE                                                                                                         |     |
| ----------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------- | --- |
| Hello             | ==Hello==             | Hello! I am BenBen, a robot dog. I am ready to assist you with any commands or questions you may have.           |     |
|                   | Stop                  | As BenBen, I would respond with a code block to stop the sport.                                                  |     |
|                   | Sit down              | I sit down.                                                                                                      |     |
|                   | Turn left             | `start_rotate(angle=90)`                                                                                         |     |
|                   | Good boy              | Hello! I'm BenBen, a robot dog. I'm ready to assist you with any commands or questions you may have.             |     |
|                   | What's your name?     | My name is BenBen.                                                                                               |     |
|                   |                       |                                                                                                                  |     |
| Stop              | Hello                 | Hello! I am BenBen, a robot dog. I am ready to assist you with any commands or questions you may have.           |     |
|                   | ==Stop==              | As BenBen, I would respond with a code block to the user's command. In this case, the user has asked me to stop. |     |
|                   | Sit down              | I sit down.                                                                                                      |     |
|                   | Turn left             | BenBen: `start_rotate(angle=90)`                                                                                 |     |
|                   | Good boy              | Hello!                                                                                                           |     |
|                   | What's your name?     | My name is BenBen.                                                                                               |     |
|                   |                       |                                                                                                                  |     |
| What's your name? | Hello                 | Hello!                                                                                                           |     |
|                   | Stop                  | As BenBen, I would respond with a code block to stop the sport.                                                  |     |
|                   | Sit down              | I am BenBen, a robot dog. I am currently sitting down.                                                           |     |
|                   | Turn left             | BenBen: `start_rotate(angle=90)`                                                                                 |     |
|                   | Good boy              | Hello!                                                                                                           |     |
|                   | ==What's your name?== | My name is BenBen.                                                                                               |     |
|                   |                       |                                                                                                                  |     |
| Sit down          | Hello                 | Hello! I am BenBen, a robot dog. I am ready to assist you with any commands or questions you may have.           |     |
|                   | Stop                  | As BenBen, I would respond with a code block to the user's command. In this case, the user has asked me to stop. |     |
|                   | ==Sit down==          | I am BenBen, a robot dog. I am currently sitting down.                                                           |     |
|                   | Turn left             | BenBen: `start_rotate(angle=90)`                                                                                 |     |
|                   | Good boy              | Hello!                                                                                                           |     |
|                   | What's your name?     | My name is BenBen.                                                                                               |     |
|                   |                       |                                                                                                                  | ✓   |
