# Connect the Hostinger site to the Sembule website editor

The public site is a separate, static multi-page Hostinger site. The editor stores private drafts in the Sembule workspace database and exposes only the published copy through a read-only public view.

## One-time database setup

Run migrations/20261008_sembule_website_content.sql in the Sembule Media Supabase project's SQL editor. The owner editor then loads with the exact copy currently visible on the Hostinger staging site.

## One-time website setup

After this Sembule OS update is deployed, open Website editor → Connect the public site once. Copy the script tag shown there; its bridge URL reflects the actual Sembule OS deployment path. Add that tag to index.html, services.html, portfolio.html, about.html, and contact.html in the Hostinger site, immediately before each closing body tag.

The bridge checks for published copy and updates the existing page while leaving its layout, photographs, logo, navigation, and form behavior in place. It does not read or transmit visitors' form entries. The current contact form still prepares a WhatsApp message for the visitor to review and send.

## Publishing

An owner can save a draft in Website editor, preview it in the Sembule layout, then publish it. After the one-time site setup, the public pages read only the published version. The old sembulemedia.com WordPress site remains separate.

If Hostinger points the staging site to a GitHub repository, the script tag can be added to that site's source and deployed through its normal workflow instead of editing each file in Hostinger File Manager.
