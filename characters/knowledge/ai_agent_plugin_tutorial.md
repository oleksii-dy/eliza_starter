one of the most powerful things about AI agent Frameworks like Eliza are the ability to build out custom plugins
plugins allow you as a developer to build out and integrate any type of custom functionality that you can
imagine and make it available for the agent workflow but also for any developer using the agent framework in
the future this is really powerful and important for a few different reasons uh first of all if you're a developer this
vastly expands the type of agent that you can build because you can now be extremely creative and build out really
any idea that you can possibly imagine if you have a software product that you would like to get in the hands of developers this is a very good
distribution mechanism because you have literally tens of thousands of developers using these agent Frameworks
and they can enable a plug-in with just a couple of lines of code and maybe just an environment variable um also if
you're a developer looking to find work there's just an a massive amount of opportunity right now in the agent space
there are tons of people looking for developers to build agents and even more a demand is there for people building
out custom Integrations and plugins and things like that so once you learn how to do this this just adds another tool
to your toolbox and allows you to kind of be more creative with the things that you can build what we're going to be
doing in this video is we're going to be starting from scratch and we're going to be building the whole plug-in from zero
to one that means we're going to be starting with a brand new project we're going to be creating our folders we're
going to be creating our files and we're going to be running it uh the plugin that we're going to be creating is is
going to be integrating the NASA API the NASA API has a lot of different features
that we can use we're just going to start with the subset of those but by the end of the video you should have a
really good understanding of how all of this works and the design patterns of building a plug-in and then you can go
and build out really anything that you would like for AI inference I'm going to be using hyperbolic a team that I've
been working closely with at Igan layer they provide a lot of different AI services but for us we're going to be
using their inference as a service where they offer kind of like a suite of different models that you can use on
demand they have models like deep seek different versions of llama we're going to be going with just the basic version
of llama and then uh for you you can kind of choose whatever model that you would like if you don't want to go with
the one that we use in this tutorial all of the code resources and links are going to be provided to you below either
on YouTube or X in the post that way you can copy and paste and code along
without running into any mistakes because we're going to be doing a lot of coding and a very short amount of time
with that being said let's go ahead and dive into our terminal and start writing some code so I'm in my terminal I'm
going to go ahead and create a new directory and I'll call this new
NASA Eliza Plugin or whatever you would like to call
this I'm going to go ahead and change into this directory and we're going to clone the Eliza repo so you can go to
the um Eliza websites and click on GitHub or you can go directly to their GitHub repository and I'm going to go
down here where we clone the latest release or I would say clone the repo
and then check out the latest release and I'm going to go ahead and
clone this into the local directory that I'm in now once this has been cloned we're
going to go ahead and check out the latest release
all right so we've checked out the latest release and we're going to go ahead and
open this up in our text
editor zoom in a little bit here so the plugins and all the other
packages are here under this packages directory so what we want to do is essentially create a new
directory there so I'm going to go ahead and change into the packages directory
and here you can kind of see all the plugins so what we're going to do is we're going to say make directory plugin
Das NASA and we're going to go ahead and
change into that directory so we're here we're in our new fresh director we have uh nothing at the
moment to get started we want to to go ahead and create a couple of files we're going to need a package.json
we're also going to need to set up a couple of things for our typescript
because we're going to be writing this in typescript so we're going to also need to have a TS config.js and we're
going to need a tsup doc
config.py um so we're now you know set up with these three files here we're
going to go ahead and make a directory for our source code
SRC we're going to change into that new directory and here we're going to go
ahead and create all the basic files we're going to need to write later so we're going to need five files here so
we're going to need index.ts that's going to be our entry point we're going to need to have some
types we're going to need to have our example which we'll go over in just a moment
we're going to need to have our services which is going to be our API calls uh
how they're configured and we're going to need an environment that is going to be how we
fetch the environment variable for the NASA plugin we're also going to need one last
directory in here called actions and these are going to be our
two actions that theas the plugin is going to do the two actions that we're going to kind of enable one of them is
going to be getting pictures from Mars and the from the different Rovers and the other is going to be getting the
Astronomy Picture of the Day from NASA so I'll create two actions for
those two things I'll say get apod D.S for the Astronomy Picture of the Day and
I will call the Mars rover photo get Mars Rover photo
TS Okay so we've just now created a bunch of different files and
folders Okay cool so we're back here we have two different terminals open one is
with our base project and one is with our um new newly created actions and
stuff for our NASA plugin all right so I'm going to go ahead and open up our
text editor and now we can go to plugin
NASA and we can see that we have everything we have here so the first thing we want to do is set up our
package.json this is going to be mainly focused around our uh
dependencies um obviously there's a lot of other configuration that you kind of just need to have a set up here and a
lot of this is very consistent across all the other plugins so you can kind of see into other plugins um some of the
entry points and things like that but the main things to really kind of check out here are going to be that we're just adding the reference to Eliza core we're
adding tsup for bundling our typescript and we're adding Zod and then we have a couple of like peer dependencies and Dev
dependencies so that's our package.json um this is going to be just for setting up our our
project um we're going to go ahead and set up our typescript config and this is just going to extend
the uh typescript config that we already have set up for the core project setting up a couple of different things around
our compiler options and including like the SRC folder and then we'll go ahead
and set up our TS uh up configuration or t-up I'm not even sure how you say that
um has all the really basic stuff that we're going to need for compiling and it kind of mentions some of the
dependencies that we're using all right so the all the base
configuration is kind of done and um this is kind of really all we need to kind of get started to start writing the
actual code for the plugin so what I'm going to do though to kind of make sure
that when we're writing our code we don't give any compiler errors is I want to go ahead and install all of the
dependencies so you're gonna notice that when I run PNP install that this is going to throw an
error it's gonna say you cannot install with frozen lock file because there is
like a PMP dot uh like lock that has all the different competencies dependencies
laid out exactly so what we can say it's pnpm install
d-el and you'll see that there is a um see here
fix lock file a flag that we can uh pass in so what we're going to say is pnpm
install and we're going to say fix lock file and this will fix the error there
for the lock file all right now that we have all of
our dependencies installed we can build the project by running pnpm
build and I'll probably need to do this actually from
the top level here so we'll run this again pnpm
build all right so the build is done and when we go back and open up um some of our files
here you'll notice that there is no longer like a compile uh or a syntax
highlight error there because we've now installed our dependencies and everything is kind of available for our
code editor so what we want to do now is start setting up all these files here
and I think a good place to start might be our types and we don't really have that many types uh that we're going to
be setting up we have two types for the different responses that we're getting from the Mars API so we have an
Astronomy Picture of the Day response and a Marge Rover data response so
before we dive into that code let's look at the Mars API real quick um so if you go to the Mars API website you can just
Google this it'll come up you can see here that you can generate an API key and that's what I've done and it just
emails you the API key and then you can start using it in your app and I believe you get like 1,000 requests uh looks
like per hour so pretty pretty decent for something like this and then you can
go down here to see the different apis and we're using the apod a Sean
picture of the day and we're also using the Mars rover so these are the two different um apis that
we're using and if you want to test them out you can just like click here and you can see that it gives you like an
example query so if I just open this example query it shows you that the
response comes back there and that's kind of it so if you
wanted to kind of know what the interface of that response looks like that's essentially what we're getting
back and that relates very closely to this type here this type here for Mars
Rover is something we're creating kind of custom because we only need a few different values and um I didn't want to
include all the other stuff we're not going to use to make it more confusing so for types we need those two types and
that's it so I'll go ahead and save that and close it uh the next thing we might open up is our index and this is
essentially the entry point for the plugin and also the structure for what a plugin
like is is kind of right here where we have this a type of plugin where you have the different fields the only
Fields we're going to be filling in are name description and actions and the actions are an array of different
actions that this plugin supports we're doing the git Astronomy Picture of the Day and git Mars Rover action plugin and
then you can also do these evaluators and providers which we're really not doing um they just allow you to do a lot
more custom functionality for your plugin I've Wroten a couple of notes here to kind of give you an idea
evaluators analyze the situations and actions taken by the agent they run after each agent action allowing the
agent to reflect on what happened and then the providers run um during or
before the actual um action gets called so let's say we called the Mars rover
action and before that ran we wanted to go and like fetch some information from another API or something um we could
kind of do that and provide different context and um ways for that to to be done
so that's the plugin and what we need to now do is Define these two actions so
we'll do that in just a moment but for now we'll just go ahead and close this file so we have our our index and our
types the next thing we'll just do real quick is our examples and examples are
pretty straightforward I'm going to um kind of minimize these two so we have
these two example arrays one for get Mars examples and one for get aod
examples these are just an array of like conversational types of things that you might expect this action to be triggered
by so here I have one conversation that might say I wonder what Mars looks like
today and then this will call the NASA get Marge Rover photo action which is
the action that we're about to create in just a moment and then we have this NASA git
aod action that will be trick when we ask things like what's the NASA Astronomy Picture of the Day I love
space I'm in love with space and time and space travel and and and different things like this and you can kind of
like create what the conversation flow might look like so these can be up to
you how you want to do that I just provided a few sometimes they hit sometimes they don't but they seem to
work pretty good so far so we have the two array of examples here and we're
done we can save that the next thing we're going to do is set up this environment function and
this is a function helper that we're going to be calling from within the action to check to make sure that we
have our environment variables set and also to return those environment variables so really the main
functionality of this file is just happening right here where we're saying cons configuration or cons config is set
to an object with the NASA API key and we're setting that to runtime. get
setting NASA API key and then we uh we basically return that
from this function and then we're going to use this validate NASA config function elsewhere and then if there's an error we just kind of throw an
error and then finally we have this Services file which is going to be the
most um code that we're going to be seeing in all of this but if I really
kind of distill this down as well it's not a whole lot going on either let's get down to the main two functions that
we have here we have the main service which returns two
functions one is get Astronomy Picture of the Day the other is get Mars Rover
photo so get Astronomy Picture of the Day basically just calls the
API at https api. nasa.gov planetary apod and then passes in the
API key and and that's kind of it and um
when if if that works it Returns the data in Json formats and if it does not it just
throws an error so very simple service that one is uh this service is a little bit more complex but also fairly simple
um we're calling this fetch Mars photos function for get Mars R photo and I
encapsulated that function separately because there's a recursive aspect to it because sometimes this will return an
empty array so I kind of do a uh another attempt if there's an empty array up to
10 attempts I've never seen it go past like one or two attempts it should resolve after one or two so um anyway so
we have Gars rub photo which car What's calls get Mars
photos this has a couple of different Rovers that we can choose from so we
have there was actually three Rovers The Curiosity the opportunity and the spirit I noticed that the spirit was really
returning um very inconsistent results so I got rid of spirit and then I noticed that the opportunity was also
not really returning the best response so I then took the opportunity out of
this object here and I'm only using curiosity um you might want to play around with this more and add
opportunity as well but for now the only um Rover that I'm returning is curiosity
and we have a couple of variables that we need for each Rover we have the Max Soul which means the max number of days
that we can query from because this is like how many days the Rover has been on on Mars and then we have the different
cameras each Rover has different cameras front back whatever and they have
different names so we're kind of like combining the different cameras with the max so which is the date with the Rover
and then we're kind of like getting a dynamic version of the photo so we'll say let's get this Rover on this camera
on this day and every time we call it kind of combines all of that together and gives us like a random photo and
that's what this logic here is doing and here and then we compose our
URL based on the Rover name the day and the camera and that's pretty it that's
pretty much it fairly straightforward and then this is where we're kind of checking to see if the
array that it returns is empty then we just like recursively call the function again if there are photos we just return
this object that has a photo a day a camera and a Rover name and then we're
going to use that in our um application or in our agent so that's the most code we're
going to look at um I feel like it's pretty straightforward though and then the last thing we're going to look at
are the two actions so we have two actions one is for get Mars Rover photo
and this is going to be using that service that we just created this is the actual like meat of what an action is so
this is kind of an important file here um we have a couple different properties here we have a name we have
which is a string we have similes which is an array we have a description we have a validate function and we have a
Handler function uh the name is pretty obvious this is the action name that
we're going to be referencing and we've already referenced elsewhere in our examples similes are kind of like similar ways that this might be called
or this might be like invoked in different other contexts the validate function makes
sure that we have our environment variable set so this actually works and then the Handler is just our custom
logic that injects different things into the runtime or I would say from the
runtime and from the current context I would say of the agent and makes it available here for us to use so the
state object has a lot of different information uh available to you uh the runtime has the environment variable for
that you know whatever um service that we wanted to use available so we're kind
of only using really the the runtime and then we're also using this call back uh
callback is also a very important um thing to understand how it works depending on where this agent is
invoked from the Callback will call back to a different um call back function I
guess you could say so uh if you're using this from the web interface the call back function will return a
response to the user in the web UI if this call back function is called from the Twitter API it will be called back
into a Twitter uh response if you're calling this from Discord or telegram that's where that call back come will
come from so that's just something to keep in mind but it's really nice because you can just invoke the call
back with whatever you would like and wherever this is being called from gets returned there so you don't have to
write a bunch of different Logic for each individual I would say like way it's
being called we're just going to write it here once and you're going to see that we're going to be using this um
action both in the web interface as well as the Twitter interface which is pretty
nice okay so um in terms of the actual service being called it's very simple
we're just saying get Mars Rover data is going to call the NASA service go.get
Mars Rover photo and then we're invoking the call back function with a string of
text that says here's the photo from Mars rover. rover with the day and the
camera and then we're setting the photo what I would like to ultimately do is maybe embed this using you know um an
actual data URI or something like that but I didn't have time to kind of get that to work so right now it's just
turning returning a link to the photo which is still fine I think so that's the get Marg rub photo
and then the last thing is the git Astronomy Picture of the Day um very similar to what we just looked at so we
won't go over all that we'll just point out that we have the NASA git aod is the
name we have the similes we have the description here we have the same
validate and Handler function and very similar um in terms of like how all this
stuff works we're just validating making sure it all is is set up with our environment variables we call the
service and we invoke the call back function passing in some text
here all right so that's all that we need to do there
and really we've done everything that we kind of need to do in terms of getting our plugin uh working um the only other
thing that we might want to do now is configure our character because right
now it's by default set to use a Json character but I actually like to use a
typescript or JavaScript character because you can actually do a lot more with it dynamically so I'm going to go
here into the agents um folder and I'm going to go ahead and create a new file
in the SRC folder called n.ch character.
Json and here in n. character. Json I'm just going to go ahead actually this
needs to be not Json it needs to be
.ts so in this character I'm just going to go ahead and drop in a character file
that I have okay so you know this is just
essentially the same thing you would see in any of the Json characters so I'm going to minimize all of these different
things um so if you go into the characters folder here you'll
see that there's a bunch of characters available this is basically the same same exact thing except um I'm using
typescript or JavaScript instead of Json um why that's as important is because
here you might want to do things like add additional clients by using um the
typed version of these so you can kind of like type in clients Dot and see all the different
things that are available which is a lot nicer I think than using Json and then you can do the same thing with the
models so you can look and see that you have access to all these different models and I'm just saying model
provider name. hyperbolic um another thing that you can do here is also use your plugins so
there's two ways to kind of integrate a plugin um and the way that we have this set up now you can either go into the
agent. TS file here and you'll notice that there's like an array of plugins
that will be enabled if there is a secret set
but I think more interestingly is to kind of like do it this way because this is kind of how most people are going to be using plugins so we're going to say
imports from and we want to point to our um
plugin here so the way that we want to to kind of understand how to write that
would be maybe to go to our package.json and see that we have like all these different um dependencies that are also
plugins so you would say something like at alaza OS plugin NASA um at the moment
this isn't going to show up because we need to actually run this
uh build and um also we need to I believe add our plugin
here so I'm going to go ahead and copy this I'm going to say plugin Das
NASA and now we need to go ahead and run the build for this to actually show up here as being available um but before we
do that the last other thing we need to do is actually make this character file
available in our index file so we're going to take this NASA plugin we're
going to drop it here and then we're going to go ahead and open our index.ts file
here and we're going to go here to the top and let's go ahead and import
main character which is what I export from
here and we want to find instances of default character and we want to replace
that with main
character and I'm going to delete this code here because it's basically saying if you pass in a character to the
command line then to use what's there but we're not doing that we're just going to be using this main
character I guess we don't need that as well well that's fine we'll just leave that for now but uh now we're loading
the main character from this character file here so I'm going to go back to my command line here and we're going to go
ahead and get set up to kind of build this but the one thing we still haven't done if you have noticed is that we
haven't set our environment variables and for our environment variables we need to go ahead and have those things
set so we can access hyperbolic so we can access the NASA API and so we can
access Twitter as well so to do that I'm going to go ahead and open up env.
example and I'm going to create a new file
called EnV and I'm going to copy env. example
and two. EnV and this is just what comes by default you know with
Eliza so we have now a new NASA configuration so we need to say NASA and
then we're going to say NASA API key and then if you remember we actually
used this NASA API key um here in our environment um file
here so we need that um we also need our Twitter stuff so for me I'm going to go
ahead and pull up all of the different credentials and put them at the top of the file so we can have it all there
together so I'm going to need Twitter username Twitter password Twitter email NASA API key and if you
remember we're also using hyperbolic so I guess I'll just take all this stuff
here and I'll put it there now I obviously can't set up um my
API key my password or any of this other stuff here but all you have to do is
kind of like say you know my NASA API key is this my username is like
that password email all these different things the thing I will set here in this tutorial though is this hyperbolic model
to kind of show you how this works so I'm going to open up hyperbolic dashboard here I'll pick
out this llama model here and for the model name you'll kind
of see it reference here so I'm just going to copy this mod meta llama
whatever here and I'm going to paste it right
there so this is the model that I'm going to use and then I'm going to close the screen or turn the camera off and
just go ahead and fill out the username and uh password and API keys and then
I'll be right back okay so my environment variables are set I want to go back to my command
line and I want to run pnpm install I'll say fix lock file just in
case all right so installation has been done and this should have basically installed I believe the um NASA plugin
into the agent um folder next we'll run pnpm build
again looks like build was successful and now is for the Moment of Truth we want to run this so we're going to run
pnpm start
and it looks like I ran into an error because my environment variables are in the wrong folder they're under
characters I need to move these into the main path so I'm going to go ahead and do that and then we're going to retry
this all right going ahead and run pnpm start again all right looks like it's running
successfully so what we want to do is open up our Twitter profile for the agent that we're working with here so
I'm going to go to to my Twitter profile for Soundcraft and it looks like it just
tweeted out something so if I kind of like copy this text and I search for it
here you'll see that it kind of matches so that looks like it's working um what we want to do now is test out the plugin
obviously so I'm going to run pnpm uh start
client and this is going to open up our um web interface which is Local Host
5173 which is right here actually 51 there we go all right so that's our agent I'm
going to click chat and I'm going to just say hello
world and it looks like the the chat is working so I'm going to
say I love space how can you help me
and see if our agent will actually invoke our
plug-in okay awesome it's saying would you like to see a current photo for the NASA astronomy database or or perhaps a
picture from Mars River yes a picture from the
astronomy database would be awesome
and boom it says here's the picture of the day it gives us the URL for that and if we open it up boom we see the picture
of the day that's amazing okay now let's test this out on Twitter so I'm going to open up Twitter
I guess and um my man handle
here and I'll go ahead and say
can you show me a picture of
space and I'm going to go ahead and like open up the terminal to see this action
hopefully being invoked in the terminal as it
happens all right if we go back to Twitter we can see that
our agent has responded here is anas astronomy picture of the day and it looks like it
responded with the same thing twice I'm wondering how we can fix that but for
now at least we have the agent working so if I go ahead and click that you see that the um picture has shown up and our
agent invoked the action based on a conversation that we had on Twitter
needs a little bit of uh polishing to kind of figure out why the exact content was posted twice but I'm pretty sure
it's something minor so that's it I know that was a lot of code but you can copy
and paste everything I wrote I'm going to be sharing all the code for you below if you have any questions or comments
please leave them in the chat feel free to reach out to me um also please if you like this video uh comment like
subscribe all that stuff and let me know what you want to see next thanks
