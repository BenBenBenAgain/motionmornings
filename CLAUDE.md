# Motion Mornings: how to work on this repo

Motion Mornings (motionmornings.com) makes short animated films of you, or of a child, doing the steps toward something. You watch it each day, then live it. Ben (GitHub: BenBenBenAgain) owns it and approves everything that goes live.

Read this whole file before you change anything. If you are one of the scheduled agents, also read your role file in `agents/`.

## The site

- Static site on GitHub Pages. Pushing to `main` deploys it within a minute or two.
- `index.html`: the front door. It shows two options, one for yourself and one for a child.
- `you.html`: the adult builder. `kids.html` and `kids.js`: the kids builder.
- `engine.js`: the shared canvas engine (logical canvas 1080 x 1920). Adult scenes are in `SCENES`. The kids module is `LSN.KIDS`, with scenes in `SC`, story templates in `PICK` and demos in `DEMOS`.
- `person()` draws every character, adults and kids, walking, in a wheelchair and in every outfit. A change there shows up everywhere, so test widely.
- `contact.js`: the contact and suggestion form, sent through FormSubmit.
- `sw.js`: the service worker. Bump its cache name (`mm-vN`) whenever you change a cached file, or phones keep the old version.
- `tools/`: test tools. See Testing below.

Character options live in three places that must stay in step:

- `LOOK_FIELDS`, `KID_FIELDS` and `LOOK_TABS` in `you.html`
- the look editor in `kids.js`
- the drawing in `engine.js`

## House rules

These come from Ben. Follow them every time.

1. **Nothing goes live without Ben's approval.** Work on a branch and open a pull request. Merge only when Ben says so: a PR comment from BenBenBenAgain such as "approved", "approve", "yep", "ok go live" or "good approved". Never merge on your own judgement.
2. **Only change what was asked.** If you think something else should change, say so in the PR and leave it alone. Ben has pushed back every time something changed quietly.
3. **Writing style:**
   - Never use em dashes. Use commas, full stops or "and".
   - Write in a natural, plain Australian tone, with no AI-sounding words ("elevate", "seamless", "unlock your potential", "journey").
   - Keep it short.
4. **Kids wording stays generic** so it suits parents, teachers and carers: "a child", "the child", "them", "your little one". Never "your child" or "your son/daughter".
5. **No over-claiming.** Make no health, therapy or outcome claims. Say "can help them feel more familiar", never "reduces anxiety" or "proven".
6. **Privacy:** people's films, faces and voices stay on their device. Nothing is uploaded except messages sent through the contact or suggestion form.
7. **No real names:** never put real names of Ben's family or friends on the site. Demos use made-up people (Ava and Mum, Theo and Dad).
8. **Look and feel:**
   - Flat, warm, simple shapes, matching what's already there.
   - When Ben says something "looks weird", change the shape properly, not by a few pixels. If he sends a reference picture, match its shape closely and simply.
   - Leave out extra details he didn't ask for, like pockets or cuffs.
9. **Brand colours:**
   - coral `#E07B66`
   - navy `#1F2E4D` / `#22325A`
   - sea `#3F7FA3`
   - gold `#F2BC6B`
   - kids green `#8CC77F`
   - kids peach background `#FBE3D3`
   - Fonts: Poppins for headings and Figtree for body text.

## Testing

Run these from the repo root. They start their own local server and work offline.

```
python3 tools/mmtest.py check                      # every page, every scene in 5 looks, both kids demos, wording rules
python3 tools/mmtest.py scene '[["walk",0.2,0.3,{"chair":true},[0,1100,600,700]]]' --out /tmp/mm-test/x.png --scale 0.5
python3 tools/mmtest.py compare origin/main '<same spec>' --out /tmp/mm-test/cmp.png   # before (main) and after (your branch)
python3 tools/mmtest.py page /kids.html --out /tmp/mm-test/kids.png                   # phone-size page screenshot
```

A scene spec is a list of `[sceneKey, time, progress, look, [x, y, w, h] crop]`. A look is any of the person fields, for example `{"body":"f","hair":"long","outfit":"dress","chair":true}`.

`check` must pass before you open a PR. Then actually look at the screenshots: most problems Ben spots are visual, not errors.

For anything visual, show before and after:

- Push the PNGs to the `review-images` branch under `pr-<number>/`.
- Embed them in the PR with `https://raw.githubusercontent.com/BenBenBenAgain/motionmornings/review-images/pr-<number>/<file>.png`.
- Create the branch as an orphan branch if it doesn't exist yet.

## Pull requests

- One change per PR. Use a short branch name, like `swim-scene`.
- **Title:** plain words.
- **Body:** two or three plain lines on what changed and why, then the pictures, then anything Ben should know (for example "this also changes how everyone walks").
- Add `Closes #<issue>` when there is one.
- Add the label `agent` to PRs opened by a scheduled agent.
- **Merge:** squash merge through the REST API:

  ```
  gh api -X PUT repos/BenBenBenAgain/motionmornings/pulls/N/merge -f merge_method=squash
  ```

  Then confirm the Pages deploy finished:

  ```
  gh api "repos/BenBenBenAgain/motionmornings/actions/runs?head_sha=SHA"
  ```

  Then delete the branch.
- GitHub GraphQL is not available here, so use `gh api` (REST) rather than `gh pr create`.

## The to-do list

It's the GitHub issues on this repo. Labels:

- `ready`: Ben has OK'd building it. Builders only take these.
- `next`: build this before other `ready` items.
- `idea`: suggested but not OK'd yet. Don't build.
- `needs-ben`: waiting on a decision or something only Ben can do.
- `from-checker`: found by the weekly checker.
- `bug`: something is broken.

The repo is public, so issues are public. Keep business plans, pricing, pitch lists and anything about money out of issues. That goes in Ben's private Launch Strategy doc.
