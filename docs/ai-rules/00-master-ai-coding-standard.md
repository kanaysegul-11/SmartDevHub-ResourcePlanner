# Master AI Coding Standard

01. Follow the existing project architecture before adding new structure.
02. Use the current backend API style, serializer style, and permission style.
03. Use the current frontend route, page, component, and API client patterns.
04. Do not introduce a new framework unless the task explicitly requires it.
05. Do not leave TODO, FIXME, placeholder data, or unfinished examples.
06. Do not hardcode secrets, tokens, client secrets, or private keys.
07. Keep `.env` files out of version control.
08. Keep SQLite databases out of version control.
09. Keep `__pycache__`, `.pyc`, build output, and dependency folders out of version control.
10. Keep setup documentation synchronized with the real project.
11. Use clear names for variables, functions, classes, and files.
12. Use one responsibility per function where practical.
13. Split long UI logic into helpers or child components.
14. Split long backend logic into service helpers when it improves clarity.
15. Avoid duplicate business logic.
16. Avoid abstractions that do not reduce real complexity.
17. Validate user input on the backend.
18. Treat frontend hiding as UX only, not security.
19. Enforce ownership and admin permissions in backend viewsets.
20. Never expose full GitHub access tokens in API responses.
21. Mask sensitive tokens in serializers.
22. Verify GitHub OAuth state before connecting an account.
23. Verify GitHub webhook signatures before processing events.
24. Handle GitHub API failures with controlled errors.
25. Support local fallback behavior when webhooks cannot use a public URL.
26. Store repository scan results as scan, violations, and developer scores.
27. Store commit and pull request activity separately from scan summary.
28. Filter non-admin developer activity to the viewer's GitHub login.
29. Allow admins to view team-wide repository and developer summaries.
30. Keep disabled rules out of active evaluation and API rule lists.
31. Do not create duplicate standard rules for the same profile and code.
32. Recalculate affected scan and repository scores when rules change.
33. Use conventional commit message validation for GitHub activity scoring.
34. Use PR body, review, and check signals for PR quality scoring.
35. AI generated code must pass the same rule evaluation as human code.
36. AI remediation must only run for repositories owned by the requesting user.
37. AI remediation must skip unsupported fixes safely.
38. AI prompt output must include expected files and a standards checklist.
39. AI prompt output must avoid uncontrolled creative choices.
40. AI prompt output must follow the selected rule files.
41. React components must use PascalCase.
42. React variables and functions must use camelCase.
43. Constants must use UPPER_SNAKE_CASE when they are true constants.
44. Hooks must only be called at top level.
45. Hooks must not be called inside loops, conditions, or nested functions.
46. API requests in the frontend must use the configured `apiClient`.
47. Routes must be registered consistently with the navigation.
48. Loading, empty, error, and success states must be handled.
49. Forms must include labels or accessible names.
50. Mutations must refresh or invalidate affected data.
51. Bulk actions must have a confirmation path.
52. Role-specific actions must be hidden in UI and blocked in API.
53. Cost fields must be hidden from non-admin users.
54. Dates, currencies, and percentages must use consistent formatting.
55. UI text should use the existing i18n pattern when available.
56. Do not mix Turkish and English randomly on the same screen.
57. Avoid console logs and debugger statements in delivery code.
58. Avoid `window.alert` for new flows when a toast pattern exists.
59. Keep frontend build and lint passing.
60. Watch bundle-size warnings and split large pages later if needed.
61. Django models must represent the business rule clearly.
62. Django serializers must validate mode-specific fields.
63. Shared licenses may have multiple active assignments.
64. Shared licenses must not exceed total seat count.
65. Assigned licenses must point to one active user.
66. Assigned licenses must force `seats_total` to one.
67. License requests must record requester and status.
68. Fulfilled license requests must assign the user to the selected asset.
69. License request status changes must notify the requester.
70. License sync and import operations must write audit logs.
71. CSV import must reject asset IDs owned by another user's file.
72. CSV removal must archive managed assigned assets.
73. CSV export must write one file per user.
74. CSV parse errors must be reported with row context.
75. Project progress must reflect completed tasks.
76. Task completion must notify relevant admins or creators.
77. Team status must derive availability from active work.
78. Team messages must not allow messaging yourself.
79. Team message edit/delete permissions must respect sender and recipient.
80. User deletion must preserve shared code library content.
81. Comments must require a rating when the business rule requires it.
82. Snippet duplicate code should be rejected.
83. Snippet author ownership must be enforced for update/delete.
84. Dashboard activity must be scoped by role.
85. Notifications must belong only to their recipient.
86. Page config data must stay authenticated.
87. GitHub repositories must be scoped to account owner for non-admin users.
88. GitHub accounts must default to current user's accounts unless team scope is requested by admin.
89. Repository detail may show repository-level violations needed for review.
90. Developer score detail must hide other developer scores from non-admin users.
91. Use retry only around operations that can safely be retried.
92. Keep database transactions short.
93. Mark stale running scans as failed.
94. Mark stale background sync jobs as failed.
95. Use `.env.example` for documented placeholder configuration.
96. Use `requirements.txt` for backend dependencies.
97. Use package-lock for frontend dependencies.
98. Keep root README focused on setup, features, and verification.
99. Keep frontend README specific to the frontend app.
100. Keep GitHub OAuth setup in dedicated docs.
101. Keep AI rule files in a dedicated docs folder.
102. Keep sample CSV docs close to sample CSV files.
103. Delivery must include a passing backend test run.
104. Delivery must include a passing frontend lint run.
105. Delivery must include a passing frontend build run.
106. If a command only fails because of sandbox permissions, rerun with proper permission and document the result.
107. Remove generated test artifacts before final delivery.
108. Remove tracked cache files before final delivery.
109. Remove tracked local database files before final delivery.
110. Remove tracked local secret files before final delivery.
111. Rotate any secret that was ever committed or shared in logs.
112. Keep file and directory names spelled correctly.
113. Document optional side apps or rename them to clear names.
114. Do not claim real AI generation exists if the feature only prepares prompts.
115. If prompt generation is used, describe it as prompt preparation and validation.
116. If one-click AI generation is required, integrate a real AI provider behind an explicit API.
117. Keep generated prompts provider-neutral.
118. Require AI output to return file paths, code blocks, and explanation.
119. Validate AI output before applying or presenting it as accepted.
120. End each AI-assisted task with a checklist against these standards.
121. AI output for this repository must be a patch to the existing project, not a detached demo.
122. Frontend main-app React code must use `.jsx` unless a migration is explicitly requested.
123. Pure frontend helpers must use `.js` unless the touched package already uses TypeScript.
124. Software Assets page changes must preserve `frontend/nexus-app/src/pages/SoftwareAssets.jsx`.
125. Software Assets components must stay under `frontend/nexus-app/src/component/softwareAssets/` when extracted.
126. Frontend API calls must use `apiClient` from `frontend/nexus-app/src/refine/axios.js`.
127. Frontend role checks must use the existing `useUser()` flow and `userData?.isAdmin`.
128. Backend software asset API fields must keep their existing names.
129. `license_mode` must remain the shared versus assigned mode field.
130. `record_type` must remain the asset source/type field.
131. `operational_status` must remain the lifecycle/status field.
132. `provider_code` must remain the provider identifier field.
133. `seats_total` must remain the total seat count field.
134. `billing_cycle`, `purchase_price`, and `currency` must remain the cost fields.
135. `assignments`, `primary_assignment`, and `license_requests` must remain relationship fields.
136. Shared company licenses must use `license_mode === "shared"`.
137. Person-assigned licenses must use `license_mode === "assigned"`.
138. Production screen code must not use mock data instead of the real API.
139. AI prompts must force exact project paths and field names before task-specific instructions.
140. The same prompt sent to different AI tools must preserve paths, fields, API client, and JSX preference.
141. Parallel frontend work must start with explicit file ownership.
142. Each AI prompt must include allowed files and forbidden files.
143. AI output must not edit files outside the assigned ownership boundary.
144. Shared file changes must be marked as coordination risks before code is generated.
145. Different AI tools may produce different wording, but they must preserve the same component API contracts.
146. Different AI tools must preserve the same visual system and interaction language.
147. Code review must check whether the result looks like one team produced it.
148. If a task conflicts with the project contract, AI must report the conflict before generating code.
149. If the conflict is not resolved, AI output must not include implementation code.
150. Team AI collaboration rules live in `06-team-ai-collaboration-rules.md`.
