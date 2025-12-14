# Prompt Templates

This directory contains prompt templates for LLM interactions.
The content and exact name of the prompt templates are arbitrary for now.

## Directory Structure

```
app/prompts/
├── __init__.py
├── prompt_manager.py          # Template loading and management
└── templates/                 # Prompt template files
    ├── system_default.txt
    ├── style_advisor.txt
    ├── color_analysis.txt
    └── wardrobe_assistant.txt
```

## Usage

### Loading Templates

```python
from app.prompts import PromptManager

pm = PromptManager()

# Load basic template
prompt = pm.get_template("system_default")

# Load with variable substitution
prompt = pm.get_template(
    "style_advisor",
    user_name="Alice",
    color_season="Warm Spring",
    face_shape="Oval",
    style_preferences="casual, minimalist"
)

# List all available templates
templates = pm.list_templates()
print(templates)  # ['color_analysis', 'style_advisor', 'system_default', 'wardrobe_assistant']
```

### Using in LangChain Service

```python
# Use template by name
response = await llm_service.generate_response(
    message="What colors should I wear?",
    template_name="color_analysis",
    template_vars={"color_season": "Cool Summer"}
)

# Or use custom system prompt
response = await llm_service.generate_response(
    message="Help me organize my wardrobe",
    system_prompt="You are a professional organizer..."
)
```

## Template Format

Templates are plain text files with optional variable substitution using `{variable_name}` syntax:

```
You are a fashion advisor for {user_name}.

Their style preferences: {style_preferences}
Their color season: {color_season}

Provide personalized advice...
```

## Available Templates

- **system_default.txt** - Default system prompt for general fashion assistant
- **style_advisor.txt** - Personalized styling advice (requires: user_name, color_season, face_shape, style_preferences)
- **color_analysis.txt** - Color season explanation (requires: color_season)
- **wardrobe_assistant.txt** - Wardrobe organization (requires: total_items, categories)

## Adding New Templates

1. Create a new `.txt` file in `templates/` directory
2. Use `{variable_name}` for variables that should be substituted
3. Load using `pm.get_template("your_template_name", variable_name="value")`

## Best Practices

- Keep templates focused and single-purpose
- Use descriptive file names (snake_case)
- Document required variables in comments at the top of the file
- Test templates with various variable values
- Version control templates alongside code changes
