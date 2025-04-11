# Rakathon 25 projekt

This is a repository for [Rakathon](https://www.rakathon.cz) in Prague 11.4.-13.4 2025.

Team Modprobe p53


# todo

- najit preklad zkratek
- podivate se na dosavadni research papers
- Napsat parser na stavajici data co jsme dostali
- Napsat jednoduchy parser na API data - (moznost pridavani souboruu v mnoha formatech -> text + jen textu)
- HTTP API v pythonu, ktere bude poskytovat endpointy na zpracovani dat.
- Backend logika ktera bude pouzivat LLM na vytvareni parametruu 
- prezentace 


extended todo:
- Dummy webova aplikace slouzici pro ukazkku
- zprasovat hodne dat timto zpusobem a zkusit nacvicit showcase statisticky model




## Prompts:

Ignore the /data directory for now and do the following task. Create a python corpus for a project that is essentially gonna be the following:

it's gonna be a dockerized API backend application that is going to have one important endpoint. On this endpoint, it's going to take a mixture of arbitrary number of documents of wide variety of formats (pdf,docx,jpg)  and also optionally a text input (this can be wrapped to a .txt file on the frontend so no need to handle it separately).

Then, it's essentiall going to process this data using an LLM call to open AI's servers or using a local LLM service. I'd like to keep both those options for now, but let's setup it primarily for openAI. The LLM's response is going to essentially need very little processing and it can be sent back as a response. 

Choose some good python tech stack for this.