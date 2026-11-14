# Laundry Orders

A simple offline order book for a laundry / ironing shop, replacing the paper receipt book.

- Find any order instantly by receipt number, customer name or phone
- Track each order: In shop → Ready → Done, with balances and payments
- Tap-to-add items from a price list (wash & iron, iron only)
- Send the receipt or a "clothes ready" message on WhatsApp
- Works offline in the browser; data is saved on the device — use **Settings → Backup** daily

Open `index.html` in any browser, or use the GitHub Pages site. On a phone, use "Add to Home screen".

## Sign-in (developer-managed)

The app asks for a username and password. Accounts are listed in `users.json` (passwords are stored only as
PBKDF2-SHA256 hashes) and only the developer changes them, from this folder:

```sh
node manage-users.mjs list
node manage-users.mjs add <username> "Shop name"   # prints a new random password once
node manage-users.mjs passwd <username>            # new random password (add --ask to type one)
node manage-users.mjs disable <username>           # or: enable / remove
git commit -am "update users" && git push
```

Each device re-checks `users.json` whenever it's opened online, so changing a password, disabling or removing a user
signs that device out within about 10 minutes (GitHub Pages cache). A device that stays offline keeps working for
up to 30 days.

This is an access gate for a static site, not server-side security: it keeps strangers and casual users out, but the
page itself is public. Orders never leave the device, so bypassing the screen exposes no shop data.
