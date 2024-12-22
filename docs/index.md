---
layout: page
title: File Index
---

{% for file in site.static_files %}
  {% assign file_path_without_ext = file.path | split: '.' | first %}
  <a href="recipes/{{ file_path_without_ext }}">{{ file.name }}</a>
{% endfor %}
