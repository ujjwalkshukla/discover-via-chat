# InVideo AI Assistant

An AI first video discovery system that replaces traditional search and browsing with a conversational assistant. Instead of navigating complex content catalogs, users interact with an AI chat interface that understands their intent and recommends relevant videos from the library.

This prototype demonstrates how Retrieval Augmented Generation (RAG) can power intelligent content discovery for a paid video learning platform while ensuring all recommendations are grounded in the actual catalog.

**Working Prototype:**

**GitHub URL**:https://ujjwalkshukla.github.io/discover-via-chat/

**Lovable**: [https://discover-via-chat.lovable.app](https://discover-via-chat.lovable.app)

---

# Overview

Modern video libraries often organize content in deep taxonomies such as category, subcategory, show, and video. As catalogs grow, this structure becomes difficult for users to navigate because they may not know where their problem fits.

The InVideo AI Assistant replaces navigation and search with a conversational discovery layer.

Users simply describe their problem or goal and the assistant:

1. Understands the user’s intent using embeddings and semantic search
2. Retrieves relevant videos from the catalog database
3. Uses an LLM to reason over retrieved results
4. Recommends the most relevant videos with explanations

The result is a **chat to play experience** where content discovery becomes fast, intuitive, and problem driven.

---

# Key Features

### AI First Discovery

The assistant acts as the primary interface for discovering content. There is no search bar. Users interact through natural language queries.

### Semantic Video Retrieval

User queries are converted into embeddings and matched against catalog embeddings using pgvector similarity search.

### Catalog Grounded Recommendations

The assistant can only recommend videos that exist in the database. This prevents hallucinated content and ensures trust in a paid subscription environment.

### Conversational Learning Experience

The assistant can clarify intent, suggest follow up questions, and guide users toward relevant content.

### Instant Video Playback

Recommended videos appear as cards inside chat and can be played immediately with one click.

### Save for Later

Users can save recommended videos for later viewing.

---

# Architecture

The system is built using a Retrieval Augmented Generation pipeline.

**Frontend**
React chat interface built with Vite and shadcn UI.

**Backend**
Supabase Postgres with Edge Functions for orchestration.

**Vector Search**
pgvector extension for semantic similarity retrieval.

**Embedding Model**
Supabase built in gte small embedding model with 384 dimensional vectors.

**LLM**
Gemini Flash accessed through the Lovable AI Gateway.

**Retrieval Flow**

User Query
→ Generate Query Embedding
→ Semantic Search using pgvector
→ Retrieve Candidate Videos
→ Send Candidates to Gemini
→ Gemini selects best videos and explains reasoning
→ UI renders video cards

This ensures the assistant remains **fully grounded in the catalog database**.

---

# Data Model

The content catalog follows a hierarchical structure:

Category → Subcategory → Show → Video

Videos store embeddings used for semantic retrieval. Additional tables store chat sessions, messages, and saved videos to support conversational discovery.

---

# Retrieval Augmented Generation

RAG is the core mechanism that powers the assistant.

Without retrieval, the LLM could fabricate recommendations. In a paid product this destroys trust.

With RAG:

• The database is the single source of truth
• The assistant only reasons over retrieved videos
• Every recommendation references a real video ID

This ensures reliable and explainable recommendations.

---

# Delight Feature (Post Analyzer)

The system also includes a prototype extension where the assistant can analyze user generated social media posts.

Instead of only recommending videos, the assistant can:

• Analyze captions or scripts
• Identify weaknesses such as poor hooks or unclear CTAs
• Suggest improved hooks, captions, and calls to action
• Recommend relevant learning videos from the catalog

This transforms the assistant from a discovery tool into a **growth mentor for creators**.

---

# Why This Project Matters

Traditional content libraries rely on navigation and search, which become ineffective as catalogs grow.

This prototype explores a different model where:

AI replaces navigation
Intent replaces taxonomy
Conversation replaces browsing

The result is a discovery system that scales naturally as the catalog expands while improving engagement and reducing time to value for users.

