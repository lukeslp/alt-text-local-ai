# Contributing to Alt Text Local AI

Thank you for your interest in contributing! I appreciate your help in making this tool better for generating accessible image descriptions.

## How to Contribute

### Reporting Bugs

If you find a bug:

1. **Check existing issues** to see if it's already reported
2. **Open a new issue** with:
   - Clear, descriptive title
   - Steps to reproduce the bug
   - Expected behavior vs actual behavior
   - Your environment (OS, Python version, model used)
   - Error messages or logs
   - Sample images (if relevant and appropriate)

### Suggesting Enhancements

Enhancement suggestions are welcome! Please open an issue with:

- Clear description of the enhancement
- Use cases that would benefit
- How it improves accessibility
- Any implementation ideas you have

### Pull Requests

1. **Fork the repository** and create your branch
2. **Make your changes** following the code style guidelines
3. **Add tests** for new functionality
4. **Update documentation** as needed
5. **Test thoroughly** with various image types
6. **Submit a pull request** with a clear description

## Development Setup

### Prerequisites

- Python 3.10 or higher
- Git
- Local AI model (Ollama, LM Studio, or similar)

### Setup Steps

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/alt-text-local-ai.git
cd alt-text-local-ai

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install development dependencies
pip install pytest pytest-cov black flake8 mypy
```

### Running Tests

```bash
# Run all tests
pytest tests/

# Run with coverage
pytest --cov=src tests/

# Run specific test
pytest tests/test_alt_text.py
```

## Code Style Guidelines

### Python Style

- Follow **PEP 8** style guidelines
- Use **type hints** for function parameters and return values
- Write **docstrings** for all public functions and classes
- Maximum line length: **88 characters** (Black default)

### Code Formatting

I use **Black** for code formatting:

```bash
# Format all Python files
black src/ tests/

# Check formatting without making changes
black --check src/ tests/
```

### Linting

I use **flake8** for linting:

```bash
# Run linter
flake8 src/ tests/

# With specific configuration
flake8 --max-line-length=88 --extend-ignore=E203 src/ tests/
```

### Type Checking

I use **mypy** for type checking:

```bash
# Run type checker
mypy src/

# With strict mode
mypy --strict src/
```

## Testing Guidelines

### Writing Tests

- Write tests for all new functionality
- Include tests for various image types (photos, screenshots, diagrams, etc.)
- Test edge cases and error handling
- Mock AI model responses for consistent testing
- Aim for >80% code coverage

### Test Structure

```python
import pytest
from alt_text_local_ai import generate_alt_text

def test_generate_alt_text():
    """Test basic alt text generation."""
    result = generate_alt_text("test_image.jpg")
    assert result is not None
    assert len(result) > 0

def test_generate_alt_text_with_context():
    """Test alt text generation with context."""
    result = generate_alt_text(
        "test_image.jpg",
        context="This image is from a tutorial about web accessibility"
    )
    assert "accessibility" in result.lower()
```

## Documentation

### Docstring Format

Use Google-style docstrings:

```python
def generate_alt_text(image_path: str, context: str = "") -> str:
    """Generate descriptive alt text for an image.
    
    Args:
        image_path: Path to the image file
        context: Optional context about where/how the image is used
        
    Returns:
        Descriptive alt text suitable for screen readers
        
    Raises:
        FileNotFoundError: If image file doesn't exist
        ValueError: If image format is not supported
        
    Example:
        >>> alt_text = generate_alt_text("photo.jpg", context="Blog post about hiking")
        >>> print(alt_text)
        "A person hiking on a mountain trail with forest in the background"
    """
    pass
```

## Accessibility Considerations

When contributing, please consider:

### Alt Text Quality

- Descriptions should be **concise but complete**
- Focus on **relevant information** based on context
- Avoid starting with "Image of" or "Picture of"
- Describe **what's important**, not every detail
- Consider the **purpose** of the image

### Model Selection

- Test with multiple local AI models
- Ensure descriptions are appropriate and accurate
- Avoid biased or inappropriate descriptions
- Validate against accessibility guidelines

### Privacy

- Never require uploading images to external services
- Keep all processing local
- Don't store or log image content
- Respect user privacy

## Commit Message Guidelines

Use clear, descriptive commit messages:

```
feat: Add support for batch processing
fix: Resolve issue with PNG transparency
docs: Update installation instructions
test: Add tests for context-aware generation
refactor: Simplify image preprocessing
```

### Commit Message Format

```
<type>: <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `refactor`: Code refactoring
- `style`: Code style changes
- `chore`: Maintenance tasks

## Pull Request Process

1. **Update your fork** with the latest changes
2. **Create a feature branch** with a descriptive name
3. **Make your changes** following the guidelines above
4. **Write/update tests** for your changes
5. **Update documentation** as needed
6. **Run tests** and ensure they pass
7. **Run linters** and fix any issues
8. **Commit your changes** with clear messages
9. **Push to your fork** and create a pull request
10. **Respond to feedback** from review

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring

## Testing
Describe testing performed

## Accessibility Impact
How does this change affect accessibility?

## Checklist
- [ ] Tests pass
- [ ] Documentation updated
- [ ] Code follows style guidelines
- [ ] Alt text quality verified
```

## Areas for Contribution

I especially welcome contributions in these areas:

### Model Support

- Adding support for new local AI models
- Optimizing prompts for better descriptions
- Improving context awareness

### Image Processing

- Better handling of different image types
- Support for more file formats
- Image preprocessing improvements

### Accessibility Features

- Context-aware description generation
- Support for different description lengths
- Integration with accessibility tools

### Documentation

- Usage examples
- Best practices for alt text
- Integration guides

## Questions or Need Help?

- Open an issue for questions
- Check existing issues and pull requests
- Review the README for usage examples

## Code of Conduct

By contributing, you agree to:

- Be respectful and inclusive
- Focus on constructive feedback
- Assume good intentions
- Help create a welcoming environment
- Prioritize accessibility in all contributions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for helping make image descriptions more accessible!

**Luke Steuber**  
[dr.eamer.dev](https://dr.eamer.dev)
