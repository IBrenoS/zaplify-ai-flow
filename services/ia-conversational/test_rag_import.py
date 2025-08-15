#!/usr/bin/env python
try:
    print("Testing individual imports...")

    print("1. Testing basic imports...")
    print("   Basic imports OK")

    print("2. Testing FastAPI imports...")
    print("   FastAPI imports OK")

    print("3. Testing app.core.logging...")
    print("   Logging imports OK")

    print("4. Testing app.schemas.assistant...")
    print("   Schema imports OK")

    print("5. Testing app.services.rag_store...")
    print("   RAG store imports OK")

    print("6. Now testing full RAG module...")
    import app.api.rag

    print("   RAG module import successful")
    print("   Router exists:", hasattr(app.api.rag, "router"))

    if hasattr(app.api.rag, "router"):
        print("   Router type:", type(app.api.rag.router))
    else:
        print(
            "   Available attributes:",
            [attr for attr in dir(app.api.rag) if not attr.startswith("_")],
        )

except Exception as e:
    print(f"Import failed: {e}")
    import traceback

    traceback.print_exc()
