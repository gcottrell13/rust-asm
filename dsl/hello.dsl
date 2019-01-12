# jump to start of program
20 #[code]
11 # jump to address 4 + this
10 #[code]

## screen palette
255 # color 0
0
0
100 # color 1
100
100
## end screen palette

## Start of program

# create a new memory block
14

## Setup screen buffer
# call 'create new buffer'
20 #[code]
1 # syscall code
15 #[code]
0 # syscall arg

# buffer start
20 #[code]
2
15 #[code]
2049

# buffer size
20 #[code]
3
15 #[code]
1024

# buffer type
20 #[code]
4 
15 #[code]
4 # OUTPUT_SCREEN

## Setup palette buffer
20 #[code]
1 # create buffer
15 #[code]
0
# buffer start
20  #[code]
2
15 #[code]
7 # start of palette buffer
# buffer length
20 #[code]
3
15 #[code]
6 # length of 6