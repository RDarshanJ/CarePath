# Contract requests

UI workers (WP 3.2, 3.3 and later) never edit `packages/shared/src/contracts` or the API. When a screen needs a field, an endpoint, an error code or a new primitive in `packages/ui` that does not exist, append a request here and keep building other parts of the screen. Do not reshape responses on the client to work around a missing field, and do not merge a screen with placeholder data (checkpoint C1, sections 3.5 and 5.7).

The contract owner (the API worker) answers each request in the same entry and links the commit. Route names and contract names are in `docs/architecture/api-phase3.md`.

## How to write a request

Copy this block to the end of the file and fill every line.

```
### CR-<next number>: <short title>

- Requested by: <work package>, <date>
- Screen or test: <route group and page, or Playwright scenario>
- Endpoint and contract: <method path, contract name>
- What is missing: <field, endpoint, error code or primitive, with its type>
- Why: <acceptance criterion or requirement id>
- Status: open
- Answer: <filled in by the contract owner: accepted with commit, or declined with reason>
```

## Requests

No requests yet.
