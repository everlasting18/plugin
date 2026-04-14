# ContentAI Manual Test Checklist

Use this checklist after changing the WordPress plugin or the Deno API.

## Preconditions

- [ ] XAMPP Apache and MySQL are running.
- [ ] WordPress admin loads at `http://localhost/wordpress/wp-admin/`.
- [ ] Plugin frontend assets were rebuilt with `npm run build` in `wp-content/plugins/contentai-plugin`.
- [ ] API server is running from `/Applications/XAMPP/xamppfiles/htdocs/wordpress/api`.
- [ ] `OPENROUTER_API_KEY` is set for the API.
- [ ] If testing web search, `TAVILY_API_KEY` is set.
- [ ] If testing Pro mode, a valid license key is available.

## 1. WordPress Admin Access

- [ ] Login as an Administrator.
- [ ] Open `ContentAI > Dashboard`.
- [ ] Confirm usage count and free limit render without PHP warnings.
- [ ] Open `ContentAI > Write`.
- [ ] Open Gutenberg editor for any post and confirm the ContentAI left panel appears.
- [ ] Open `ContentAI > Calendar`.

Expected:
- Dashboard, Write, Editor, and Calendar pages load without console errors or broken layout.

## 2. Permission and Nonce Protection

- [ ] Login as a low-privilege user without `edit_posts`.
- [ ] Try opening `ContentAI > Write`, `Calendar`, and the post editor.
- [ ] From browser devtools or Postman, call:
  - `GET /wordpress/?rest_route=/contentai/v1/posts`
  - `POST /wordpress/wp-admin/admin-ajax.php?action=contentai_api`
  - `POST /wordpress/wp-admin/admin-ajax.php?action=contentai_schedule`
- [ ] Repeat one AJAX call without `_wpnonce`.

Expected:
- Low-privilege user is blocked.
- Missing nonce requests fail.
- No route allows unauthorized scheduling or post creation.

## 3. Full Generate Flow on `/write`

- [ ] Open `ContentAI > Write`.
- [ ] Submit a prompt with `length`, `audience`, `framework`, and `webSearch` enabled.
- [ ] Wait for generation to finish and redirect to the WordPress post editor.
- [ ] Confirm a new draft is created.
- [ ] Confirm the draft title matches generated output.
- [ ] Confirm the post body is populated.
- [ ] Repeat with `webSearch` disabled.
- [ ] Repeat with a clearly different `length` choice and confirm output length changes noticeably.

Expected:
- No JSON parse error.
- Draft creation succeeds.
- Turning web search off still generates content.
- Length setting visibly affects the article size.

## 4. Gutenberg Left Panel Generate Flow

- [ ] Open a new post in Gutenberg.
- [ ] Generate 1 article from the left panel.
- [ ] Confirm stream progress messages appear while generating.
- [ ] Confirm a result card appears after `[DONE]`.
- [ ] Click insert and confirm blocks are inserted into the editor.
- [ ] Confirm H1 is not duplicated in content if the title is already set separately.

Expected:
- Streaming works.
- Generated content inserts as Gutenberg blocks.

## 5. Multi-Post Quota Behavior

- [ ] Use a free-tier site or free-tier test domain.
- [ ] Note the starting usage count in Dashboard or the left-panel badge.
- [ ] Generate 2 articles in one request from Gutenberg.
- [ ] Refresh the page.
- [ ] Re-open Dashboard.

Expected:
- Usage increases by 2, not 1.
- Badge and Dashboard stay in sync after refresh.

## 6. Free Limit Enforcement

- [ ] On a free-tier site, generate until only 1 article remains.
- [ ] Try requesting 2 articles in one request.
- [ ] Then request 1 article.
- [ ] After usage reaches the limit, try generating again from `/write` and from Gutenberg.

Expected:
- Requesting more articles than remaining quota is blocked with a clear message.
- A final in-limit request still succeeds.
- After the limit is reached, further generate requests fail with `429` behavior/message.

## 7. Pro License Behavior

- [ ] Activate a valid Pro license.
- [ ] Reload Dashboard, Write page, and Gutenberg.
- [ ] Generate multiple articles.
- [ ] Confirm there is no free-limit warning.

Expected:
- UI shows Pro state.
- Generation is not blocked by free-limit logic.

## 8. Calendar Data Loading

- [ ] Open `ContentAI > Calendar`.
- [ ] Confirm draft sidebar loads draft posts.
- [ ] Confirm scheduled posts for the current month load.
- [ ] Confirm already-published posts for the current month also load.
- [ ] Switch months forward and backward.

Expected:
- Calendar shows both `future` and `publish` posts in the selected month.
- Month switching updates results correctly.

## 9. Calendar Filters

- [ ] In Calendar, set status filter to `Lên lịch`.
- [ ] Set status filter to `Đã đăng`.
- [ ] Choose a specific category from the category filter.
- [ ] Test a post that has multiple categories.

Expected:
- Status filter changes visible posts correctly.
- Category filter works even though post categories come back as term objects.

## 10. Drag-and-Drop Scheduling

- [ ] Drag a draft from the sidebar onto a date cell.
- [ ] In the modal, confirm the scheduled time.
- [ ] Refresh the page.
- [ ] Confirm the post moved from drafts into the calendar.
- [ ] Open the scheduled post in WordPress and verify `future` status and scheduled datetime.

Expected:
- Scheduling succeeds through AJAX.
- Post date is saved correctly.

## 11. Error Handling

- [ ] Stop the API server and try generating from `/write`.
- [ ] Start the API again, then remove or invalidate the license key and try generating.
- [ ] If possible, simulate AI provider failure or rate limiting.

Expected:
- UI shows a readable error.
- Invalid license returns a license-related message.
- Rate limit / provider errors do not crash the page.

## 12. Final Regression Pass

- [ ] Check browser console on Write, Editor, and Calendar pages.
- [ ] Check PHP error log.
- [ ] Check API logs for generate requests.
- [ ] Confirm no unexpected warnings after a full test cycle.

Expected:
- No new JS errors.
- No PHP notices/warnings from ContentAI routes.
- API request logs show expected generate and quota behavior.
