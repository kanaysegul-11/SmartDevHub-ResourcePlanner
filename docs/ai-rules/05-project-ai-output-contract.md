# Project AI Output Contract

01. This file is mandatory when any AI tool writes code for this repository.
02. The purpose is not to make every AI answer identical word for word.
03. The purpose is to make every AI use the same project paths, model fields, API contracts, and delivery style.
04. The output must target the existing SmartDevHub-ResourcePlanner repository.
05. The output must be written as an applicable patch to the current project.
06. The output must not create a detached demo app unless the task explicitly asks for a new app.
07. The output must not create a separate Software Assets screen in a new unused folder.
08. The output must not invent a second domain model for software licenses.
09. The output must not invent a second API client.
10. The output must not invent a new route when an existing route already serves the feature.
11. The main frontend app lives under `frontend/nexus-app`.
12. The main frontend app uses React and Vite.
13. The main frontend app currently uses JSX for page and component files.
14. New main-app React screen files must use `.jsx`.
15. New main-app helper files must use `.js`.
16. Do not migrate a touched feature to TypeScript unless the task explicitly asks for a TypeScript migration.
17. Do not mix `.tsx` examples into the main Vite app output.
18. Do not use standalone mock component examples as the final answer.
19. Preserve the current routing style.
20. Preserve the current layout style.
21. Preserve the current authentication and user-context style.
22. Preserve the current data-fetching style.
23. The Software Assets page path is `frontend/nexus-app/src/pages/SoftwareAssets.jsx`.
24. Software Assets component files belong under `frontend/nexus-app/src/component/softwareAssets/` when extraction is needed.
25. Software Assets utility files may live under `frontend/nexus-app/src/utils/` only when the logic is shared.
26. The API client is `apiClient` from `frontend/nexus-app/src/refine/axios.js`.
27. Frontend code must not call `fetch` directly for existing backend API flows.
28. Frontend code must not create a second axios instance for existing backend API flows.
29. Role checks must use the existing `useUser()` flow.
30. Admin checks must use `userData?.isAdmin` unless an existing local file already uses a narrower helper.
31. Non-admin UI must hide admin-only actions.
32. Non-admin access must still be enforced by backend permissions, not only frontend hiding.
33. Software asset backend field names are fixed.
34. Do not rename `license_mode`.
35. Do not rename `record_type`.
36. Do not rename `operational_status`.
37. Do not rename `provider_code`.
38. Do not rename `seats_total`.
39. Do not rename `billing_cycle`.
40. Do not rename `purchase_price`.
41. Do not rename `currency`.
42. Do not rename `assignments`.
43. Do not rename `primary_assignment`.
44. Do not rename `license_requests`.
45. Company-wide shared licenses use `license_mode === "shared"`.
46. Person-assigned licenses use `license_mode === "assigned"`.
47. Shared licenses may have more than one active assignment.
48. Assigned licenses represent one primary assigned user.
49. Do not replace this mode split with `type`, `scope`, `category`, or `licenseType` in API-facing code.
50. UI labels may say "Ortak" and "Kişiye atanmış", but API values must remain stable.
51. Cost display must use `purchase_price` and `currency`.
52. Seat display must use `seats_total` and assignment counts from the existing data.
53. Renewal and lifecycle display must follow existing date fields in the model or serializer.
54. License request display must use the existing request relation and serializer shape.
55. Do not add mock license arrays to production page code.
56. Do not add seed data to frontend page code.
57. Do not use local-only demo state as a replacement for the real API.
58. Temporary UI state is allowed only for forms, filters, modals, and optimistic interaction.
59. API-loaded records must remain the source of truth.
60. If backend data is missing, state the missing field and add the minimal serializer/API change.
61. Do not silently invent frontend-only fields to hide a backend gap.
62. New code must follow existing file naming conventions.
63. React component names must be PascalCase.
64. Functions and variables must be camelCase.
65. True constants must use UPPER_SNAKE_CASE.
66. JSX must keep heavy calculations outside the returned markup.
67. Hooks must stay at component top level.
68. Component extraction must reduce complexity or reuse a real pattern.
69. Do not create a component folder that is not imported anywhere.
70. Do not create an index export unless it is actually used or matches the local folder pattern.
71. Do not add a dependency when existing code or browser APIs solve the problem cleanly.
72. Do not add a design system package for one screen.
73. Do not replace existing styling strategy.
74. Keep Tailwind usage compatible with the current app.
75. Keep colors, spacing, and radius close to the current app style.
76. Do not create a marketing landing page for an internal operations screen.
77. Internal tool screens should prioritize dense, scannable, repeatable workflows.
78. Forms must have accessible labels.
79. Buttons inside forms must declare `type`.
80. Tables must use semantic table markup when tabular comparison is needed.
81. Empty, loading, error, and success states must be handled.
82. Admin mutation flows must refresh affected data after success.
83. Deletion or bulk actions must have a confirmation path.
84. User-facing errors must be controlled and understandable.
85. Do not use `window.alert` for new app flows when existing UI feedback patterns are available.
86. Do not use `dangerouslySetInnerHTML`.
87. Do not hardcode secrets, tokens, OAuth client secrets, or private keys.
88. Do not commit `.env` files.
89. Do not commit SQLite databases.
90. Do not commit cache files, build output, or dependency folders.
91. Backend code must preserve existing Django app structure.
92. Backend serializers must validate mode-specific software asset rules.
93. Backend viewsets must preserve ownership and admin permission checks.
94. Backend changes must include or update tests when behavior changes.
95. Frontend changes must keep lint passing.
96. Frontend changes must keep build passing.
97. Backend changes must keep the Django test suite passing.
98. AI output must include a file-based change summary.
99. AI output must include exact existing file paths.
100. AI output must explain whether it edits existing files or adds new files.
101. AI output must not say "create these files anywhere".
102. AI output must not leave "replace with your path" instructions.
103. AI output must not include TODO, FIXME, placeholder data, or pseudo-code.
104. AI output must include imports, exports, state wiring, event handlers, and API wiring.
105. AI output must include role behavior when the touched feature is role-sensitive.
106. AI output must include validation behavior when the touched feature accepts user input.
107. AI output must include risk or assumption notes when project context is missing.
108. AI output must end with a standards checklist.
109. The same task sent to ChatGPT, Gemini, Copilot, or another AI must keep the same paths.
110. The same task sent to different AI tools must keep the same backend field names.
111. The same task sent to different AI tools must keep the same API client.
112. The same task sent to different AI tools must keep the same JSX preference.
113. The same task sent to different AI tools must keep the same role-check convention.
114. The same task sent to different AI tools must avoid mock data in production code.
115. The same task sent to different AI tools must request a patch against the current project.
116. Different wording is acceptable.
117. Different helper extraction is acceptable when it stays inside the approved paths.
118. Different UI microcopy is acceptable only when it does not change domain meaning.
119. Different architecture is not acceptable when it breaks the fixed project contract.
120. This file must be included with the other AI rule files before asking an AI to implement project code.
