# PVault 2

SPA em HTML, CSS e JavaScript puro com roteamento via hash e seletor global de mês sincronizado com a URL.

## Arquivos

- `index.html`: estrutura base da aplicação.
- `styles.css`: estilos mobile-first.
- `app.js`: roteador, componentes e controle do mês.
- `firebase.js`: bootstrap do Firebase via CDN.
- `rtdb.rules.json`: regras sugeridas do Realtime Database.

## Como executar

Use qualquer servidor estático. Exemplo:

```bash
python -m http.server 8000
```

Acesse `http://localhost:8000` no navegador.

## Configuração manual do Firebase

1) Ative **Authentication → Email/Password** no console do Firebase.
2) Crie um **Realtime Database** em modo bloqueado.
3) Copie o `firebaseConfig` do projeto e cole em `firebase.js`.
4) Aplique o conteúdo de `rtdb.rules.json` nas regras do RTDB.

## Modelo RTDB

```
/users/{uid}/categories/{categoryId}
/users/{uid}/cards/{cardId}
/users/{uid}/tx/{txId}
/users/{uid}/txByMonth/{YYYY-MM}/{txId}: true
/users/{uid}/cardTxByInvoice/{cardId}/{invoiceYYYY-MM}/{txId}: true
/users/{uid}/invoices/{cardId}/{invoiceYYYY-MM}/meta
```

## Repositório RTDB

O repositório está exposto em `window.pvaultRepository.transactions` e inclui:

- `createTransaction(tx)`
- `updateTransaction(txId, patch)`
- `deleteTransaction(txId)`
- `listMonthTransactions(monthKey)`
- `listInvoiceTransactions(cardId, invoiceMonthKey)`

## Rotas

- `#/login`
- `#/app/dashboard`
- `#/app/transactions`
- `#/app/cards`
- `#/app/invoices`
- `#/app/import`

O mês ativo é controlado por `?m=YYYY-MM` e também fica salvo em `sessionStorage`.
