# Setting up The Late City

The order to do things in Ghost Admin after the theme is activated. About
twenty minutes, once.

A theme cannot create tags, pages or navigation: those live in your Ghost
database, and only you can put them there. Until you do, the site still
works, it simply has less in it. Nothing below will break a live site.

---

**1. Create the Technology tag.**
Settings, Tags, New tag. Name `Technology`. Check the slug is `technology`.
In the description, write what the desk is for; it prints on the desk page.

**2. Create the Philosophy tag.**
Same again. Name `Philosophy`, slug `philosophy`, and a description.

**3. Create the internal tag `#this-week`.**
Settings, Tags, New tag, name it exactly `#this-week`. The hash makes it
internal, so it never appears on the site. It is how you fill the "This
week" module on the front page.

**4. Set the navigation.**
Settings, Navigation, primary:

```
Front page          /
Technology          /tag/technology/
Philosophy          /tag/philosophy/
About               /about/
```

**5. Write the About page.**
Pages, new page, title `About`, slug `about`. Use Heading 2 for each
section; with three or more of them the page grows a contents column.

**6. Write the Editorial standards page.**
Title `Editorial standards`, slug `editorial-standards`. Give it a
`Corrections` heading: the footer links straight to it.

**7. Write the Privacy page.**
Title `Privacy`, slug `privacy`.

**8. Check the newsletter.**
Settings, Newsletters. The Late Letter form on the site subscribes people
to your default newsletter. Confirm you have one and that it is the one you
mean. Ghost needs mail configured before anything can actually be sent.

**9. Fill in the theme settings, and set the brand colour.**
Settings, Design and branding. Set the masthead note and the Late Letter
copy under Homepage. Add a contact and a corrections address under Site
wide if you want them in the footer.

Set the **brand colour** to `#A81430`, the publication's red, while you are
there. That colour is Ghost's, not the theme's: it paints the Portal
buttons and the signup card an editor can drop into a story. Left at
Ghost's default pink it is both off the publication's palette and too
light to read white text on.

**10. Set the publication title, description and timezone.**
Settings, General. The title is the wordmark, set lowercase with a red full
stop. The description is the paragraph in the footer.

Set the timezone while you are there. The dateline at the top of the page is
rendered by Ghost in the publication's timezone, so a site left on UTC will
show yesterday's date to a reader in India for part of every day.

**11. Publish your first stories.**
Tag each one in this order: the desk first, the type second, topics after.
See section 3 of README.md.

**12. Feature the lead.**
Open the story you want at the top of the front page and turn on
**Feature this post**. Do not also give it `#this-week`.

---

Once all twelve are done the front page has a lead, a curated This week, two
desks with stories in them, a Latest column and a working letter.
