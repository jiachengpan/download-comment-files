# download-comment-files

This action downloads any hyperlink referenced in the comment, as long as the target file has matched suffix as specified.
Typical usage is to trigger this on `issue_comment` and `issues` events.

Following is an example configuration:

    steps:
    - name: download from comments
      uses: jiachengpan/download-comment-files@v1
      with:
        suffix: "pdf|txt|pptx|docx"
        output: downloads

The `suffix` is a regex field, which will be used to test if the referenced file has matching file ext / type.
The `output` is the target path to keep the downloaded files.

To get what files are downloaded, one can use following settings:

    steps:
    - id: download
      uses: jiachengpan/download-comment-files@master
      with:
        suffix: pdf
    - name: get the output
      run: echo "downloaded ${{ steps.download.outputs.files }}"

