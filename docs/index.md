---
layout: page
title: File Index
---

{% for file in site.static_files %}
- [{{ file.name }}]({{ file.path | split: '.', 1 | first }})
{% endfor %}
