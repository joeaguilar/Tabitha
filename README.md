# Tabitha
A chrome extension of tab tools

# How to install
Clone the repo to a place you want the extension to  live.

After you have the repo cloned, go to your extension settings in Chrome by navigating to [chrome://extensions/](chrome://extensions/).

Enable Developer Mode on the right.

Click the "Load unpacked" button and navigate to where you have the extension downloaded and select it. Ensure it is loaded by toggling the extension on.

Note: The extension now uses the VT323. I cant just include somebody else's font in this repo so I'll include the instructions to add the font.

	You can get the font here: https://fonts.google.com/specimen/VT323

	Download and unpack the font and make it so that there is a folder called VT323 with the OFL.txt and the VT323-Regular.tff inside that folder.


This repo now includes icons from [iconoir](https://iconoir.com/) and the can be found here [license here](https://github.com/iconoir-icons/iconoir/blob/main/LICENSE).

# Start <-
Move the tab to the start
# -
Move the tab backwards
# +
Move the tab forwards
# End ->
Move the tab to the end

# Disrcard All
Unload all open tabs - This action frees up memory by removing all tabs from memory wihtout closing and will require a reload for the tab content to come back.

# Download Active Session [beta]
Download a JSON file of your open windows, tabs and groups.

# Download Active Window
Download a JSON file of your active window, tabs and groups.

# Upload and Open
Uploads and opens a JSON session.