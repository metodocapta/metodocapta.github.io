# Camada 3D — guardada, não apagada

Estes arquivos **não entram no carregamento normal do site**. Eles só são
baixados quando alguém liga o 3D de propósito:

- pela URL: `?3d=on` (ou `?movimento=on`)
- ou pelo atributo `data-fm-3d="on"` no `<html>`

O `movimento.js` faz `import()` dinâmico destes arquivos. Sem esse pedido
explícito, **nenhum byte daqui chega ao visitante** — por isso eles podem
parecer "código morto" numa auditoria. **Não são: não apague.**

| arquivo | papel |
|:--|:--|
| `three.module.min.js` | Three.js (671 KB) — dependência dos três abaixo |
| `hero-3d.js` | campo 3D do hero |
| `radar-3d.js` | campo 3D do Radar |
| `mapa-3d.js` | mapa 3D do bloco de percurso |
| `nitidez.js` | ajuste de nitidez/qualidade conforme o hardware |

## Por que continuam no repositório

Decisão de 03/11/2026: o custo de mantê-los é **706 KB de repositório**
(irrelevante no GitHub Pages) e o custo de removê-los seria **desligar uma
feature que funciona**, mexendo no motor de movimento. Como não há ganho de
performance — o visitante não baixa nada —, ficam guardados aqui, com esta
placa.

`ambiente-particulas.js` (5,5 KB) fica em `assets/marca/` pelo mesmo motivo:
é carregado em `requestIdleCallback`, só quando o movimento está ligado.

## Se um dia quiser religar

1. nada a fazer: já está ligado por `?3d=on`;
2. se quiser tornar padrão, mude o *gate* em `movimento.js` (hoje exige o
   opt-in explícito);
3. teste em `?3d=on` **e** sem o parâmetro — o site precisa continuar
   funcionando sem 3D, que é o caso de 100% dos visitantes hoje.

## Se quiser mesmo reduzir o repositório

O caminho seguro não é apagar daqui: é mover a pasta **inteira** para fora de
`MARKETING/SITE_METODO_CAPTA/` e remover os três `import()` do `movimento.js`
num commit próprio, com o site publicado antes e depois para comparar.
