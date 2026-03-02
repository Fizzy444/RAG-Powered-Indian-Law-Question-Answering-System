def build_context(query, ranked_results, max_docs=5, max_chars=3000):
    header = (
        "You are an Indian legal research assistant.\n"
        "You will be given legal text as context.\n\n"
        "Write the answer in EXACTLY the following format:\n\n"
        "Main Rule:\n"
        "<one short paragraph here>\n\n"
        "Explanation:\n"
        "<one short paragraph here>\n\n"
        "Conditions / Notes:\n"
        "<one short paragraph here>\n\n"
        "Sources:\n"
        "- Act name, Section\n\n"
        "Rules:\n"
        "- Keep each section as a separate paragraph.\n"
        "- Do not merge sections into one paragraph.\n"
        "- Preserve line breaks exactly.\n"
    )

    context_blocks = []
    used_chars = 0
    count = 1

    for r in ranked_results[:max_docs]:
        meta = r["metadata"] 
        text = r["text"]

        if meta["document_type"] == "constitution":
            title = (
                f"Constitution of India — Article {meta['article']} "
                f"({meta['part']})"
            )
        else:
            title = (
                f"{meta['law_name']} — Section {meta['section']}"
            )

        block = f"[{count}] {title}\n{text.strip()}\n\n"

        if used_chars + len(block) > max_chars:
            break

        context_blocks.append(block)
        used_chars += len(block)
        count += 1

    context = header + "".join(context_blocks)
    prompt = context + "\n---\nQUESTION:\n" + query + "\nANSWER:\n"
    return prompt